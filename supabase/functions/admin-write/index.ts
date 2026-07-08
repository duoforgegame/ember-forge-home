import { preflight, json } from "../_shared/cors.ts";
import { verifyJwt } from "../_shared/jwt.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ALLOWED_TABLES = new Set([
  "site_projects", "site_team", "site_about", "site_socials",
  "site_header_links", "site_footer_links",
]);

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
        const clean = rows.map((r: any) => { const c: any = { ...r }; if (!c.id) delete c.id; return c; });
        const { error, data } = await sb.from(table).upsert(clean).select();
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
      default:
        return json({ error: "Unknown op" }, { status: 400 }, origin);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 }, origin);
  }
});
