// Server-side Cloudflare Turnstile verification, never trust a client side pass.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string, ip?: string | null): Promise<{ ok: boolean; error?: string }> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return { ok: false, error: "Bot protection is not configured on the server" };
  if (!token) return { ok: false, error: "Please complete the verification checkbox" };

  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const out = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (out.success) return { ok: true };
    const codes = out["error-codes"] ?? [];
    if (codes.includes("timeout-or-duplicate")) {
      return { ok: false, error: "Verification expired, please tick the checkbox again" };
    }
    return { ok: false, error: "Verification failed, please tick the checkbox again" };
  } catch {
    return { ok: false, error: "Could not reach the verification service, please try again" };
  }
}
