// Shared password reset helpers for the Skin Creator accounts.
// Used by skin-auth (public "Forgot password") and admin-write (admin triggered reset).
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const enc = new TextEncoder();

export function toHex(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hex, used for reset tokens (high-entropy, so no salt/stretching needed). */
export async function sha256Hex(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(input)));
}

export const SITE_URL = () =>
  (Deno.env.get("SITE_URL") || "https://duoforgegames.com").replace(/\/+$/, "");

/** Sends the reset mail over the same IONOS SMTP setup the contact form uses. */
export async function sendResetMail(to: string, username: string, resetUrl: string): Promise<void> {
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST")!,
      port: Number(Deno.env.get("SMTP_PORT") ?? "465"),
      tls: (Deno.env.get("SMTP_SECURE") ?? "true") === "true",
      auth: { username: Deno.env.get("SMTP_USER")!, password: Deno.env.get("SMTP_PASS")! },
    },
  });
  const text = `Hi ${username},

you (or someone else) requested a new password for your Duo Forge Skin Creator account.

Set a new password:
${resetUrl}

The link is valid for 1 hour and can only be used once.
If you did not request this, you can simply ignore this email, your password stays unchanged.

Please do not reply to this message. This mailbox cannot receive emails.

Duo Forge Games`;
  await client.send({
    from: Deno.env.get("SKIN_RESET_FROM") || "no-reply@duoforgegames.com",
    to,
    subject: "Reset your password, Duo Forge Skin Creator",
    content: text,
    html: `<p>Hi ${username},</p>
<p>you (or someone else) requested a new password for your <strong>Duo Forge Skin Creator</strong> account.</p>
<p><a href="${resetUrl}">Set a new password</a></p>
<p style="font-size:12px;color:#666">${resetUrl}</p>
<p>The link is valid for <strong>1 hour</strong> and can only be used once.</p>
<p>If you did not request this, you can simply ignore this email, your password stays unchanged.</p>
<p style="font-size:12px;color:#666">Please do not reply to this message. This mailbox cannot receive emails.</p>
<p>Duo Forge Games</p>`,
  });
  await client.close();
}

/**
 * Stores a fresh reset token for the user and mails the link.
 * Returns false when the account has no email on file, nothing is sent then.
 */
export async function issueResetForUser(
  sb: any,
  user: { id: string; username: string; email: string | null },
): Promise<boolean> {
  if (!user.email) return false;
  const raw = `${crypto.randomUUID()}${toHex(crypto.getRandomValues(new Uint8Array(24)))}`;
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { error } = await sb
    .from("skin_creator_users")
    .update({ reset_token_hash: await sha256Hex(raw), reset_token_expires_at: expires })
    .eq("id", user.id);
  if (error) throw error;
  await sendResetMail(user.email, user.username, `${SITE_URL()}/skincreator/reset-password?token=${raw}`);
  return true;
}
