// Lightweight username/password accounts for the Unboxed Skin Creator.
// Completely separate from the /admin password login (different JWT issuer).
import { preflight, json } from "../_shared/cors.ts";
import { signJwt, verifyJwt } from "../_shared/jwt.ts";
import { rateLimit, clientIp } from "../_shared/ratelimit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { issueResetForUser, sha256Hex } from "../_shared/skinreset.ts";


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
        const email = String(body.email ?? "").trim().toLowerCase();
        if (email && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255)) {
          return json({ error: "Invalid email address" }, { status: 400 }, origin);
        }
        const { data: existing } = await sb.from("skin_creator_users").select("id").ilike("username", username).maybeSingle();
        if (existing) return json({ error: "Username already taken" }, { status: 409 }, origin);
        if (email) {
          const { data: mailTaken } = await sb.from("skin_creator_users").select("id").ilike("email", email).maybeSingle();
          if (mailTaken) return json({ error: "This email is already in use" }, { status: 409 }, origin);
        }
        const password_hash = await hashPassword(password);
        const { data, error } = await sb
          .from("skin_creator_users")
          .insert({ username, password_hash, email: email || null })
          .select("id, username")
          .single();
        if (error) {
          if (String(error.message).includes("duplicate")) return json({ error: "Username or email already taken" }, { status: 409 }, origin);
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
      case "submit": {
        const auth = req.headers.get("authorization") ?? "";
        const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const c = bearer ? await verifyJwt(bearer, jwtSecret, ISS) : null;
        if (!c?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        if (!rateLimit(`skinsubmit:${c.sub}`, 30, 60 * 60 * 1000)) return json({ error: "Too many submissions" }, { status: 429 }, origin);
        const weapon_id = String(body.weapon_id ?? "");
        const discord_name = String(body.discord_name ?? "").trim();
        if (!weapon_id || !discord_name || discord_name.length > 120) {
          return json({ error: "Weapon and Discord name are required" }, { status: 400 }, origin);
        }
        const pixel_data = Array.isArray(body.pixel_data) ? body.pixel_data.slice(0, 300_000) : [];
        const { error } = await sb.from("skin_submissions").insert({
          weapon_id,
          pixel_data,
          preview_image_url: String(body.preview_image_url ?? "").slice(0, 2000),
          player_name: body.player_name ? String(body.player_name).slice(0, 80) : null,
          discord_name,
          email: body.email ? String(body.email).slice(0, 255) : null,
          status: "pending",
          user_id: String(c.sub),
        });
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "list_my_submissions": {

        const auth = req.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const claims = token ? await verifyJwt(token, jwtSecret, ISS) : null;
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        const { data, error } = await sb
          .from("skin_submissions")
          .select("id, status, created_at, preview_image_url, player_name, discord_name, weapon_id, pixel_data, weapons(id, name, canvas_width, canvas_height, template_image_url, category_id)")
          .eq("user_id", String(claims.sub))
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        return json({ rows: data ?? [], user: { id: claims.sub, username: claims.username } }, { status: 200 }, origin);
      }
      case "request_password_reset": {
        // Always answers { ok: true } so account/email existence can't be probed.
        if (!rateLimit(`skinreset:${ip}`, 10, 60 * 60 * 1000)) return json({ error: "Too many attempts" }, { status: 429 }, origin);
        const identifier = String(body.identifier ?? "").trim();
        if (!identifier || identifier.length > 255) return json({ ok: true }, { status: 200 }, origin);
        try {
          const col = identifier.includes("@") ? "email" : "username";
          const { data: user } = await sb
            .from("skin_creator_users")
            .select("id, username, email")
            .ilike(col, identifier)
            .maybeSingle();
          if (user) await issueResetForUser(sb, user as any);
        } catch (e) {
          console.error("password reset request failed", e);
        }
        await new Promise((r) => setTimeout(r, 250));
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "confirm_password_reset": {
        if (!rateLimit(`skinresetconfirm:${ip}`, 20, 60 * 60 * 1000)) return json({ error: "Too many attempts" }, { status: 429 }, origin);
        const rawToken = String(body.token ?? "").trim();
        const newPassword = String(body.new_password ?? "");
        if (newPassword.length < 8 || newPassword.length > 200) {
          return json({ error: "Password must be at least 8 characters" }, { status: 400 }, origin);
        }
        if (!rawToken || rawToken.length > 500) return json({ error: "Link is invalid or expired" }, { status: 400 }, origin);
        const { data: user } = await sb
          .from("skin_creator_users")
          .select("id, reset_token_expires_at")
          .eq("reset_token_hash", await sha256Hex(rawToken))
          .gt("reset_token_expires_at", new Date().toISOString())
          .maybeSingle();
        if (!user) return json({ error: "Link is invalid or expired" }, { status: 400 }, origin);
        const { error } = await sb
          .from("skin_creator_users")
          .update({
            password_hash: await hashPassword(newPassword),
            reset_token_hash: null,
            reset_token_expires_at: null,
          })
          .eq("id", user.id)
          .not("reset_token_hash", "is", null);
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      default:

        return json({ error: "Unknown op" }, { status: 400 }, origin);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 }, origin);
  }
});
