import { preflight, json } from "../_shared/cors.ts";
import { signJwt } from "../_shared/jwt.ts";
import { rateLimit, clientIp } from "../_shared/ratelimit.ts";

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const origin = req.headers.get("origin");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 }, origin);

  const ip = clientIp(req);
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) return json({ error: "Too many attempts" }, { status: 429 }, origin);

  let body: { password?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400 }, origin); }

  const password = String(body.password ?? "");
  const expected = Deno.env.get("ADMIN_PASSWORD") ?? "";
  const jwtSecret = Deno.env.get("ADMIN_JWT_SECRET") ?? "";
  if (!expected || !jwtSecret) return json({ error: "Server not configured" }, { status: 500 }, origin);

  await new Promise((r) => setTimeout(r, 300));
  if (!safeEq(password, expected)) return json({ error: "Invalid password" }, { status: 401 }, origin);

  const token = await signJwt({ sub: "admin" }, jwtSecret);
  return json({ token }, { status: 200 }, origin);
});
