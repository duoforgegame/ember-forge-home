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

  let body: { name?: string; email?: string; subject?: string; message?: string; inquiry_type?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400 }, origin); }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();
  const inquiryRaw = String(body.inquiry_type ?? "").trim().toLowerCase();
  const ALLOWED_TYPES = ["player", "press", "publisher", "other"] as const;
  const inquiry_type = (ALLOWED_TYPES as readonly string[]).includes(inquiryRaw) ? inquiryRaw : "";
  const TYPE_LABELS: Record<string, string> = {
    player: "Player",
    press: "Press / Media",
    publisher: "Publisher / Business",
    other: "Other",
  };
  if (!name || name.length > 100) return json({ error: "Invalid name" }, { status: 400 }, origin);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) return json({ error: "Invalid email" }, { status: 400 }, origin);
  if (!subject || subject.length > 150) return json({ error: "Invalid subject" }, { status: 400 }, origin);
  if (!message || message.length > 2000) return json({ error: "Invalid message" }, { status: 400 }, origin);
  if (!inquiry_type) return json({ error: "Invalid inquiry type" }, { status: 400 }, origin);

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    await sb.from("contact_submissions").insert({ name, email, subject, message, inquiry_type });
  } catch (e) {
    console.error("DB insert failed", e);
  }

  const typeLabel = TYPE_LABELS[inquiry_type];
  const subjectTag = inquiry_type.charAt(0).toUpperCase() + inquiry_type.slice(1);

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
      subject: `[${subjectTag}] ${subject}`,
      content: `Inquiry type: ${typeLabel}\nFrom: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>Inquiry type:</strong> ${esc(typeLabel)}</p><p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p><p><strong>Subject:</strong> ${esc(subject)}</p><hr><pre style="font-family:inherit;white-space:pre-wrap">${esc(message)}</pre>`,
    });
    await client.close();
  } catch (e) {
    console.error("SMTP send failed", e);
    return json({ error: "Email delivery failed" }, { status: 502 }, origin);
  }

  return json({ ok: true }, { status: 200 }, origin);
});
