import { preflight, json } from "../_shared/cors.ts";
import { verifyJwt } from "../_shared/jwt.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ALLOWED_TABLES = new Set([
  "site_projects", "site_team", "site_about", "site_socials",
  "site_header_links", "site_footer_links", "site_status_colors", "site_legal", "site_announcement",
  "site_press_kits", "site_press_screenshots", "site_game_page_blocks",
]);
const COVERS_BUCKET = "project-covers";
const PRESS_BUCKET = "press-kit-assets";
const UPLOAD_BUCKETS: Record<string, { bucket: string; folder: string; exts: Set<string> }> = {
  cover: { bucket: COVERS_BUCKET, folder: "covers", exts: new Set(["jpg", "jpeg", "png", "webp"]) },
  press_image: { bucket: PRESS_BUCKET, folder: "images", exts: new Set(["jpg", "jpeg", "png", "webp", "gif"]) },
  press_logo: { bucket: PRESS_BUCKET, folder: "logos", exts: new Set(["png", "webp", "svg"]) },
  press_zip: { bucket: PRESS_BUCKET, folder: "zips", exts: new Set(["zip"]) },
};

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
      default:
        return json({ error: "Unknown op" }, { status: 400 }, origin);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 }, origin);
  }
});
