// Minimal HS256 JWT (no deps)
const encoder = new TextEncoder();
function b64url(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? btoa(bytes) : btoa(String.fromCharCode(...bytes));
  return b.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function signJwt(payload: Record<string, unknown>, secret: string, ttlSeconds = 8 * 60 * 60): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const body = { iss: "duoforge-admin", iat: now, exp: now + ttlSeconds, ...payload };
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(data)));
  return `${data}.${b64url(sig)}`;
}
export async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const ok = await crypto.subtle.verify("HMAC", await key(secret), b64urlDecode(s), encoder.encode(`${h}.${p}`));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as Record<string, unknown>;
    const exp = payload.exp as number | undefined;
    if (exp && Math.floor(Date.now() / 1000) > exp) return null;
    if (payload.iss !== "duoforge-admin") return null;
    return payload;
  } catch { return null; }
}
