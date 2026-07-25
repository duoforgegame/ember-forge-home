// Lightweight username/password accounts for the Unboxed Skin Creator.
// Completely separate from the /admin password login (different JWT issuer).
import { preflight, json } from "../_shared/cors.ts";
import { signJwt, verifyJwt } from "../_shared/jwt.ts";
import { rateLimit, clientIp } from "../_shared/ratelimit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ISS = "duoforge-skinuser";
const ITERATIONS = 120_000;
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return toHex(bits);
}
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${await derive(password, salt, ITERATIONS)}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const got = await derive(password, fromHex(parts[2]), iterations);
  if (got.length !== parts[3].length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ parts[3].charCodeAt(i);
  return diff === 0;
}

const secret = () => Deno.env.get("SKIN_JWT_SECRET") || Deno.env.get("ADMIN_JWT_SECRET") || "";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const origin = req.headers.get("origin");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 }, origin);

  const jwtSecret = secret();
  if (!jwtSecret) return json({ error: "Server not configured" }, { status: 500 }, origin);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400 }, origin); }

  const ip = clientIp(req);
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    switch (body.op) {
      case "register": {
        if (!rateLimit(`skinreg:${ip}`, 10, 60 * 60 * 1000)) return json({ error: "Too many attempts" }, { status: 429 }, origin);
        const username = String(body.username ?? "").trim();
        const password = String(body.password ?? "");
        if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
          return json({ error: "Username must be 3–24 characters (letters, numbers, _ . -)" }, { status: 400 }, origin);
        }
        if (password.length < 8 || password.length > 200) {
          return json({ error: "Password must be at least 8 characters" }, { status: 400 }, origin);
        }
        const { data: existing } = await sb.from("skin_creator_users").select("id").ilike("username", username).maybeSingle();
        if (existing) return json({ error: "Username already taken" }, { status: 409 }, origin);
        const password_hash = await hashPassword(password);
        const { data, error } = await sb.from("skin_creator_users").insert({ username, password_hash }).select("id, username").single();
        if (error) {
          if (String(error.message).includes("duplicate")) return json({ error: "Username already taken" }, { status: 409 }, origin);
          throw error;
        }
        const token = await signJwt({ sub: data.id, username: data.username }, jwtSecret, 30 * 24 * 60 * 60, ISS);
        return json({ token, user: data }, { status: 200 }, origin);
      }
      case "login": {
        if (!rateLimit(`skinlogin:${ip}`, 20, 15 * 60 * 1000)) return json({ error: "Too many attempts" }, { status: 429 }, origin);
        const username = String(body.username ?? "").trim();
        const password = String(body.password ?? "");
        if (!username || !password) return json({ error: "Username and password required" }, { status: 400 }, origin);
        const { data: user } = await sb
          .from("skin_creator_users")
          .select("id, username, password_hash")
          .ilike("username", username)
          .maybeSingle();
        await new Promise((r) => setTimeout(r, 250));
        if (!user || !(await verifyPassword(password, user.password_hash))) {
          return json({ error: "Invalid username or password" }, { status: 401 }, origin);
        }
        const token = await signJwt({ sub: user.id, username: user.username }, jwtSecret, 30 * 24 * 60 * 60, ISS);
        return json({ token, user: { id: user.id, username: user.username } }, { status: 200 }, origin);
      }
      case "list_my_submissions": {
        const auth = req.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const claims = token ? await verifyJwt(token, jwtSecret, ISS) : null;
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        const { data, error } = await sb
          .from("skin_submissions")
          .select("id, status, created_at, preview_image_url, player_name, discord_name, weapon_id, weapons(id, name, canvas_width, canvas_height, template_image_url, category_id)")
          .eq("user_id", String(claims.sub))
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        return json({ rows: data ?? [], user: { id: claims.sub, username: claims.username } }, { status: 200 }, origin);
      }
      default:
        return json({ error: "Unknown op" }, { status: 400 }, origin);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 }, origin);
  }
});
