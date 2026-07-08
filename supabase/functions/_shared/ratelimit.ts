type Bucket = { times: number[] };
const buckets = new Map<string, Bucket>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { times: [] };
  b.times = b.times.filter((t) => now - t < windowMs);
  if (b.times.length >= max) { buckets.set(key, b); return false; }
  b.times.push(now);
  buckets.set(key, b);
  return true;
}
export function clientIp(req: Request): string {
  const h = req.headers;
  return h.get("cf-connecting-ip") || h.get("x-real-ip") || (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}
