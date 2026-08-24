// Lightweight username/password accounts for the Unboxed Skin Creator.
// Completely separate from the /admin password login (different JWT issuer).
import { preflight, json } from "../_shared/cors.ts";
import { signJwt, verifyJwt } from "../_shared/jwt.ts";
import { rateLimit, clientIp } from "../_shared/ratelimit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { issueResetForUser, sha256Hex } from "../_shared/skinreset.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";


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

async function readSkinClaims(req: Request, jwtSecret: string): Promise<any | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = token ? await verifyJwt(token, jwtSecret, ISS) : null;
  return claims?.sub ? claims : null;
}

async function toggleAccountVote(sb: any, userId: string, submissionId: string): Promise<{ voted: boolean; vote_count: number }> {
  if (!submissionId) throw new Error("Missing submission");

  const { data: sub, error: subError } = await sb
    .from("skin_submissions")
    .select("id, status")
    .eq("id", submissionId)
    .maybeSingle();
  if (subError) throw subError;
  if (!sub || !["approved", "in_game"].includes(String(sub.status))) throw new Error("Skin not found");

  const { data: existing, error: existingError } = await sb
    .from("skin_votes")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;

  let voted: boolean;
  if (existing) {
    const { error } = await sb.from("skin_votes").delete().eq("id", existing.id);
    if (error) throw error;
    voted = false;
  } else {
    const { error } = await sb
      .from("skin_votes")
      .insert({ submission_id: submissionId, user_id: userId });
    if (error && !String(error.message).includes("duplicate")) throw error;
    voted = true;
  }

  const { count, error: countError } = await sb
    .from("skin_votes")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", submissionId);
  if (countError) throw countError;
  return { voted, vote_count: count ?? 0 };
}


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
      case "guest_submit": {
        if (!rateLimit(`skinguest:${ip}`, 20, 60 * 60 * 1000)) return json({ error: "Too many submissions" }, { status: 429 }, origin);
        const cap = await verifyTurnstile(String(body.turnstile_token ?? ""), ip);
        if (!cap.ok) return json({ error: cap.error }, { status: 400 }, origin);
        const weapon_id = String(body.weapon_id ?? "");
        const discord_name = String(body.discord_name ?? "").trim();
        if (!weapon_id || !discord_name || discord_name.length > 120) {
          return json({ error: "Weapon and a name are required" }, { status: 400 }, origin);
        }
        const pixel_data = Array.isArray(body.pixel_data) ? body.pixel_data.slice(0, 300_000) : [];
        const { error } = await sb.from("skin_submissions").insert({
          weapon_id,
          pixel_data,
          preview_image_url: String(body.preview_image_url ?? "").slice(0, 2000),
          skin_name: body.skin_name ? String(body.skin_name).slice(0, 80) : null,
          player_name: body.player_name ? String(body.player_name).slice(0, 80) : null,
          discord_name,
          email: body.email ? String(body.email).slice(0, 255) : null,
          status: "pending",
        });
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "submit": {
        const auth = req.headers.get("authorization") ?? "";
        const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const c = bearer ? await verifyJwt(bearer, jwtSecret, ISS) : null;
        if (!c?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        if (!rateLimit(`skinsubmit:${c.sub}`, 30, 60 * 60 * 1000)) return json({ error: "Too many submissions" }, { status: 429 }, origin);
        const cap = await verifyTurnstile(String(body.turnstile_token ?? ""), ip);
        if (!cap.ok) return json({ error: cap.error }, { status: 400 }, origin);
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
          skin_name: body.skin_name ? String(body.skin_name).slice(0, 80) : null,
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
          .select("id, status, created_at, preview_image_url, skin_name, player_name, discord_name, weapon_id, pixel_data, weapons(id, name, canvas_width, canvas_height, template_image_url, category_id)")
          .eq("user_id", String(claims.sub))
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        return json({ rows: data ?? [], user: { id: claims.sub, username: claims.username } }, { status: 200 }, origin);
      }
      case "my_votes":
      case "gallery_my_upvotes": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Please sign in to upvote skins" }, { status: 401 }, origin);
        const { data, error } = await sb
          .from("skin_votes")
          .select("submission_id")
          .eq("user_id", String(claims.sub))
          .limit(5000);
        if (error) throw error;
        return json({ ids: (data ?? []).map((r: any) => r.submission_id) }, { status: 200 }, origin);
      }
      case "toggle_vote":
      case "gallery_toggle_upvote": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Please sign in to upvote skins" }, { status: 401 }, origin);
        if (!rateLimit(`skinvote:${claims.sub}`, 120, 60 * 60 * 1000)) {
          return json({ error: "Too many votes, please slow down" }, { status: 429 }, origin);
        }
        const submissionId = String(body.submission_id ?? body.skin_id ?? "");
        try {
          const result = await toggleAccountVote(sb, String(claims.sub), submissionId);
          return json(result, { status: 200 }, origin);
        } catch (voteError) {
          const message = (voteError as Error).message;
          if (message === "Missing submission") return json({ error: message }, { status: 400 }, origin);
          if (message === "Skin not found") return json({ error: message }, { status: 404 }, origin);
          throw voteError;
        }
      }
      case "save_draft": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        if (!rateLimit(`skindraft:${claims.sub}`, 300, 60 * 60 * 1000)) {
          return json({ error: "Too many saves, please slow down" }, { status: 429 }, origin);
        }
        const weapon_template_id = String(body.weapon_template_id ?? "");
        if (!weapon_template_id) return json({ error: "Weapon is required" }, { status: 400 }, origin);
        const canvas_data = Array.isArray(body.canvas_data) ? body.canvas_data.slice(0, 300_000) : [];
        const name = body.name ? String(body.name).slice(0, 80) : null;
        const draftId = body.draft_id ? String(body.draft_id) : "";

        if (draftId) {
          const { data, error } = await sb
            .from("skin_creator_drafts")
            .update({ canvas_data, name, weapon_template_id, updated_at: new Date().toISOString() })
            .eq("id", draftId)
            .eq("user_id", String(claims.sub))
            .select("id")
            .maybeSingle();
          if (error) throw error;
          if (data) return json({ id: data.id }, { status: 200 }, origin);
        }

        const { count } = await sb
          .from("skin_creator_drafts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", String(claims.sub));
        if ((count ?? 0) >= 50) return json({ error: "Draft limit reached, please delete an older draft" }, { status: 400 }, origin);

        const { data, error } = await sb
          .from("skin_creator_drafts")
          .insert({ user_id: String(claims.sub), weapon_template_id, canvas_data, name })
          .select("id")
          .single();
        if (error) throw error;
        return json({ id: data.id }, { status: 200 }, origin);
      }
      case "list_drafts": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        const { data, error } = await sb
          .from("skin_creator_drafts")
          .select("id, name, canvas_data, weapon_template_id, created_at, updated_at, weapons:weapon_template_id(id, name, canvas_width, canvas_height, template_image_url, category_id)")
          .eq("user_id", String(claims.sub))
          .order("updated_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return json({ rows: data ?? [] }, { status: 200 }, origin);
      }
      case "list_palettes": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        const { data, error } = await sb
          .from("skin_creator_palettes")
          .select("id, name, colors, created_at, updated_at")
          .eq("user_id", String(claims.sub))
          .order("updated_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return json({ rows: data ?? [] }, { status: 200 }, origin);
      }
      case "save_palette": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        if (!rateLimit(`skinpalette:${claims.sub}`, 120, 60 * 60 * 1000)) {
          return json({ error: "Too many saves, please slow down" }, { status: 429 }, origin);
        }
        const name = String(body.name ?? "").trim().slice(0, 60);
        if (!name) return json({ error: "Palette name is required" }, { status: 400 }, origin);
        const colors = (Array.isArray(body.colors) ? body.colors : [])
          .map((c: unknown) => String(c).trim().toLowerCase())
          .filter((c: string) => /^#[0-9a-f]{6}$/.test(c))
          .slice(0, 32);
        if (colors.length === 0) return json({ error: "Add at least one colour" }, { status: 400 }, origin);
        const paletteId = body.palette_id ? String(body.palette_id) : "";

        if (paletteId) {
          const { data, error } = await sb
            .from("skin_creator_palettes")
            .update({ name, colors, updated_at: new Date().toISOString() })
            .eq("id", paletteId)
            .eq("user_id", String(claims.sub))
            .select("id")
            .maybeSingle();
          if (error) throw error;
          if (data) return json({ id: data.id }, { status: 200 }, origin);
        }

        const { count } = await sb
          .from("skin_creator_palettes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", String(claims.sub));
        if ((count ?? 0) >= 12) {
          return json({ error: "Palette limit reached, please delete one first" }, { status: 400 }, origin);
        }
        const { data, error } = await sb
          .from("skin_creator_palettes")
          .insert({ user_id: String(claims.sub), name, colors })
          .select("id")
          .single();
        if (error) throw error;
        return json({ id: data.id }, { status: 200 }, origin);
      }
      case "delete_palette": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        const paletteId = String(body.palette_id ?? "");
        if (!paletteId) return json({ error: "Missing palette" }, { status: 400 }, origin);
        const { error } = await sb
          .from("skin_creator_palettes")
          .delete()
          .eq("id", paletteId)
          .eq("user_id", String(claims.sub));
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "delete_draft": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        const draftId = String(body.draft_id ?? "");
        if (!draftId) return json({ error: "Missing draft" }, { status: 400 }, origin);
        const { error } = await sb
          .from("skin_creator_drafts")
          .delete()
          .eq("id", draftId)
          .eq("user_id", String(claims.sub));
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "list_case_data": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        const userId = String(claims.sub);
        const [{ data: skins, error: skinErr }, { data: cases, error: caseErr }] = await Promise.all([
          sb
            .from("skin_submissions")
            .select("id, skin_name, status, created_at, preview_image_url, pixel_data, weapons(id, name, canvas_width, canvas_height, template_image_url)")
            .eq("user_id", userId)
            .eq("status", "approved")
            .order("created_at", { ascending: false })
            .limit(500),
          sb
            .from("skin_creator_cases")
            .select("id, case_name, status, created_at, skin_creator_case_items(id, rarity, sort_order, skin_submissions(id, skin_name, preview_image_url, pixel_data, weapons(id, name, canvas_width, canvas_height, template_image_url)))")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);
        if (skinErr) throw skinErr;
        if (caseErr) throw caseErr;
        return json({ skins: skins ?? [], cases: cases ?? [] }, { status: 200 }, origin);
      }
      case "submit_case": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        const userId = String(claims.sub);
        if (!rateLimit(`skincase:${userId}`, 20, 60 * 60 * 1000)) {
          return json({ error: "Too many case submissions, please slow down" }, { status: 429 }, origin);
        }
        const RARITIES = [
          "consumer_grade", "industrial_grade", "mil_spec", "restricted",
          "classified", "covert", "special",
        ];
        const caseName = String(body.case_name ?? "").trim().slice(0, 80);
        if (!caseName) return json({ error: "Case name is required" }, { status: 400 }, origin);
        const rawItems = Array.isArray(body.items) ? body.items : [];
        if (rawItems.length < 2 || rawItems.length > 17) {
          return json({ error: "A case needs between 2 and 17 skins" }, { status: 400 }, origin);
        }
        const items = rawItems.map((it: any, i: number) => ({
          skin_submission_id: String(it?.skin_submission_id ?? ""),
          rarity: String(it?.rarity ?? ""),
          sort_order: i,
        }));
        if (items.some((it) => !it.skin_submission_id || !RARITIES.includes(it.rarity))) {
          return json({ error: "Every skin needs a valid rarity" }, { status: 400 }, origin);
        }
        const ids = [...new Set(items.map((it) => it.skin_submission_id))];
        if (ids.length !== items.length) return json({ error: "A skin can only be added once" }, { status: 400 }, origin);
        const { data: owned, error: ownErr } = await sb
          .from("skin_submissions")
          .select("id")
          .in("id", ids)
          .eq("user_id", userId)
          .eq("status", "approved");
        if (ownErr) throw ownErr;
        if ((owned ?? []).length !== ids.length) {
          return json({ error: "You can only use your own approved skins" }, { status: 400 }, origin);
        }

        const { data: created, error: caseError } = await sb
          .from("skin_creator_cases")
          .insert({ user_id: userId, case_name: caseName, status: "pending" })
          .select("id")
          .single();
        if (caseError) throw caseError;

        const { error: itemError } = await sb
          .from("skin_creator_case_items")
          .insert(items.map((it) => ({ ...it, case_id: created.id })));
        if (itemError) {
          await sb.from("skin_creator_cases").delete().eq("id", created.id);
          throw itemError;
        }
        return json({ id: created.id }, { status: 200 }, origin);
      }
      case "delete_case": {
        const claims = await readSkinClaims(req, jwtSecret);
        if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 }, origin);
        const caseId = String(body.case_id ?? "");
        if (!caseId) return json({ error: "Missing case" }, { status: 400 }, origin);
        const { error } = await sb
          .from("skin_creator_cases")
          .delete()
          .eq("id", caseId)
          .eq("user_id", String(claims.sub));
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
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
        return json({ error: `Unknown op: ${String(body.op ?? "")}` }, { status: 400 }, origin);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 }, origin);
  }
});
