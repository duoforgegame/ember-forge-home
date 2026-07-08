import { preflight, json } from "../_shared/cors.ts";
import { rateLimit, clientIp } from "../_shared/ratelimit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const origin = req.headers.get("origin");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 }, origin);

  const ip = clientIp(req);
  if (!rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)) {
    return json({ error: "Too many messages, please try again later." }, { status: 429 }, origin);
  }

  let body: { name?: string; email?: string; subject?: string; message?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400 }, origin); }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();
  if (!name || name.length > 100) return json({ error: "Invalid name" }, { status: 400 }, origin);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) return json({ error: "Invalid email" }, { status: 400 }, origin);
  if (!subject || subject.length > 150) return json({ error: "Invalid subject" }, { status: 400 }, origin);
  if (!message || message.length > 2000) return json({ error: "Invalid message" }, { status: 400 }, origin);

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    await sb.from("contact_submissions").insert({ name, email, subject, message });
  } catch (e) {
    console.error("DB insert failed", e);
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST")!,
        port: Number(Deno.env.get("SMTP_PORT") ?? "465"),
        tls: (Deno.env.get("SMTP_SECURE") ?? "true") === "true",
        auth: {
          username: Deno.env.get("SMTP_USER")!,
          password: Deno.env.get("SMTP_PASS")!,
        },
      },
    });
    const to = Deno.env.get("CONTACT_RECIPIENT") ?? Deno.env.get("SMTP_FROM")!;
    const from = Deno.env.get("SMTP_FROM")!;
    await client.send({
      from,
      to,
      replyTo: email,
      subject: `[Duo Forge] ${subject}`,
      content: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p><p><strong>Subject:</strong> ${esc(subject)}</p><hr><pre style="font-family:inherit;white-space:pre-wrap">${esc(message)}</pre>`,
    });
    await client.close();
  } catch (e) {
    console.error("SMTP send failed", e);
    return json({ error: "Email delivery failed" }, { status: 502 }, origin);
  }

  return json({ ok: true }, { status: 200 }, origin);
});
