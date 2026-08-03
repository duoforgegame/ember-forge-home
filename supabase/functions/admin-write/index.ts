import { preflight, json } from "../_shared/cors.ts";
import { verifyJwt } from "../_shared/jwt.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { issueResetForUser } from "../_shared/skinreset.ts";

const ALLOWED_TABLES = new Set([
  "site_projects", "site_team", "site_about", "site_socials",
  "site_header_links", "site_footer_links", "site_status_colors", "site_legal", "site_announcement",
  "site_press_kits", "site_press_screenshots", "site_game_page_blocks", "site_featured_game",
  "weapon_categories", "weapons", "skin_submissions",
]);
const COVERS_BUCKET = "project-covers";
const PRESS_BUCKET = "press-kit-assets";
const UPLOAD_BUCKETS: Record<string, { bucket: string; folder: string; exts: Set<string> }> = {
  cover: { bucket: COVERS_BUCKET, folder: "covers", exts: new Set(["jpg", "jpeg", "png", "webp"]) },
  press_image: { bucket: PRESS_BUCKET, folder: "images", exts: new Set(["jpg", "jpeg", "png", "webp", "gif"]) },
  press_logo: { bucket: PRESS_BUCKET, folder: "logos", exts: new Set(["png", "webp", "svg"]) },
  press_zip: { bucket: PRESS_BUCKET, folder: "zips", exts: new Set(["zip"]) },
  weapon_template: { bucket: PRESS_BUCKET, folder: "weapons", exts: new Set(["png", "webp"]) },
};

/** Best effort removal of a submission preview image, Supabase Storage or VPS upload folder. */
async function deletePreviewAsset(sb: any, url: string): Promise<void> {
  if (!url) return;
  try {
    const marker = "/storage/v1/object/public/";
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const rest = url.slice(idx + marker.length);
      const slash = rest.indexOf("/");
      if (slash > 0) {
        await sb.storage.from(rest.slice(0, slash)).remove([decodeURIComponent(rest.slice(slash + 1))]);
      }
      return;
    }
    const deleteUrl = Deno.env.get("SKIN_UPLOAD_DELETE_URL");
    const deleteSecret = Deno.env.get("SKIN_UPLOAD_DELETE_SECRET");
    if (deleteUrl && deleteSecret) {
      await fetch(deleteUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-delete-secret": deleteSecret },
        body: JSON.stringify({ url }),
      });
    }
  } catch (e) {
    console.error("preview delete failed", url, e);
  }
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const origin = req.headers.get("origin");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 }, origin);

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const jwtSecret = Deno.env.get("ADMIN_JWT_SECRET") ?? "";
  const claims = token ? await verifyJwt(token, jwtSecret) : null;
  if (!claims) return json({ error: "Unauthorized" }, { status: 401 }, origin);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400 }, origin); }

  try {
    switch (body.op) {
      case "list_submissions": {
        const { data, error } = await sb.from("contact_submissions").select("*").order("created_at", { ascending: false }).limit(500);
        if (error) throw error;
        return json({ rows: data ?? [] }, { status: 200 }, origin);
      }
      case "delete_submission": {
        const id = String(body.id ?? "");
        if (!id) return json({ error: "Missing id" }, { status: 400 }, origin);
        const { error } = await sb.from("contact_submissions").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "upsert": {
        const table = String(body.table ?? "");
        if (!ALLOWED_TABLES.has(table)) return json({ error: "Table not allowed" }, { status: 400 }, origin);
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (rows.length === 0) return json({ ok: true, count: 0 }, { status: 200 }, origin);
        const clean = rows.map((r: any) => { const c: any = { ...r }; if (c.id === null || c.id === undefined || c.id === "") delete c.id; return c; });
        // defaultToNull: false → PostgREST won't fill missing columns (like `id`) with NULL,
        // so rows without an id use the column's DEFAULT (gen_random_uuid()).
        const { error, data } = await sb.from(table).upsert(clean, { defaultToNull: false }).select();
        if (error) throw error;
        return json({ ok: true, rows: data }, { status: 200 }, origin);
      }
      case "delete": {
        const table = String(body.table ?? "");
        if (!ALLOWED_TABLES.has(table)) return json({ error: "Table not allowed" }, { status: 400 }, origin);
        const id = body.id;
        if (id === undefined || id === null) return json({ error: "Missing id" }, { status: 400 }, origin);
        const { error } = await sb.from(table).delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "list_skin_submissions": {
        const { data, error } = await sb
          .from("skin_submissions")
          .select("*, weapons(id, name, category_id, template_image_url, canvas_width, canvas_height)")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (error) throw error;
        return json({ rows: data ?? [] }, { status: 200 }, origin);
      }
      case "set_skin_status": {
        const id = String(body.id ?? "");
        const status = String(body.status ?? "");
        if (!id) return json({ error: "Missing id" }, { status: 400 }, origin);
        if (!["pending", "approved", "rejected", "in_game"].includes(status)) return json({ error: "Invalid status" }, { status: 400 }, origin);
        const { error } = await sb.from("skin_submissions").update({ status }).eq("id", id);
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "sign_cover_upload": {
        const ext = String(body.ext ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const allowedExt = new Set(["jpg", "jpeg", "png", "webp"]);
        if (!allowedExt.has(ext)) return json({ error: "Invalid extension" }, { status: 400 }, origin);
        const uuid = crypto.randomUUID();
        const path = `covers/${uuid}.${ext}`;
        const { data, error } = await sb.storage.from(COVERS_BUCKET).createSignedUploadUrl(path);
        if (error) throw error;
        const publicUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/${COVERS_BUCKET}/${path}`;
        return json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl, bucket: COVERS_BUCKET }, { status: 200 }, origin);
      }
      case "sign_upload": {
        const kind = String(body.kind ?? "");
        const cfg = UPLOAD_BUCKETS[kind];
        if (!cfg) return json({ error: "Invalid upload kind" }, { status: 400 }, origin);
        const ext = String(body.ext ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!cfg.exts.has(ext)) return json({ error: "Invalid extension" }, { status: 400 }, origin);
        const uuid = crypto.randomUUID();
        const path = `${cfg.folder}/${uuid}.${ext}`;
        const { data, error } = await sb.storage.from(cfg.bucket).createSignedUploadUrl(path);
        if (error) throw error;
        const publicUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/${cfg.bucket}/${path}`;
        return json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl, bucket: cfg.bucket }, { status: 200 }, origin);
      }
      case "list_skin_users": {
        // Email is deliberately not returned, only whether one is on file.
        const { data: users, error } = await sb
          .from("skin_creator_users")
          .select("id, username, created_at, email")
          .order("created_at", { ascending: false })
          .limit(2000);
        if (error) throw error;
        const { data: subs, error: subErr } = await sb
          .from("skin_submissions")
          .select("user_id")
          .not("user_id", "is", null)
          .limit(10000);
        if (subErr) throw subErr;
        const counts = new Map<string, number>();
        for (const r of subs ?? []) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
        const rows = (users ?? []).map((u: any) => ({
          id: u.id,
          username: u.username,
          created_at: u.created_at,
          has_email: !!u.email,
          submission_count: counts.get(u.id) ?? 0,
        }));
        return json({ rows }, { status: 200 }, origin);
      }
      case "admin_delete_skin_user": {
        const id = String(body.id ?? "");
        if (!id) return json({ error: "Missing id" }, { status: 400 }, origin);
        const { error } = await sb.from("skin_creator_users").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "admin_reset_skin_user_password": {
        const username = String(body.username ?? "").trim();
        if (!username) return json({ error: "Missing username" }, { status: 400 }, origin);
        const { data: user, error } = await sb
          .from("skin_creator_users")
          .select("id, username, email")
          .ilike("username", username)
          .maybeSingle();
        if (error) throw error;
        if (!user) return json({ error: "User not found" }, { status: 404 }, origin);
        const sent = await issueResetForUser(sb, user as any);
        return json({ ok: true, sent }, { status: 200 }, origin);
      }
      case "list_skin_cases": {
        const { data, error } = await sb
          .from("skin_creator_cases")
          .select("id, case_name, status, created_at, user_id, skin_creator_users(id, username), skin_creator_case_items(id, rarity, sort_order, skin_submissions(id, skin_name, preview_image_url, pixel_data, weapons(id, name, canvas_width, canvas_height, template_image_url)))")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        return json({ rows: data ?? [] }, { status: 200 }, origin);
      }
      case "set_skin_case_status": {
        const id = String(body.id ?? "");
        const status = String(body.status ?? "");
        if (!id) return json({ error: "Missing id" }, { status: 400 }, origin);
        if (!["pending", "approved", "rejected"].includes(status)) return json({ error: "Invalid status" }, { status: 400 }, origin);
        const { error } = await sb
          .from("skin_creator_cases")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "delete_skin_case": {
        const id = String(body.id ?? "");
        if (!id) return json({ error: "Missing id" }, { status: 400 }, origin);
        const { error } = await sb.from("skin_creator_cases").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true }, { status: 200 }, origin);
      }
      case "bulk_delete_submissions_by_status": {

        const status = String(body.status ?? "");
        if (!["approved", "rejected"].includes(status)) return json({ error: "Invalid status" }, { status: 400 }, origin);
        const { data: rows, error } = await sb
          .from("skin_submissions")
          .select("id, preview_image_url")
          .eq("status", status);
        if (error) throw error;
        for (const r of rows ?? []) await deletePreviewAsset(sb, r.preview_image_url ?? "");
        const { error: delErr } = await sb.from("skin_submissions").delete().eq("status", status);
        if (delErr) throw delErr;
        return json({ ok: true, deleted: (rows ?? []).length }, { status: 200 }, origin);
      }
      default:
        return json({ error: "Unknown op" }, { status: 400 }, origin);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 }, origin);
  }
});
