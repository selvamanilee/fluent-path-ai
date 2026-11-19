// Fixed-window in-memory limiter. Suitable for a single instance; use Redis for horizontal scaling.
const buckets = new Map<string, { count: number; reset: number }>();
const env = (k: string, d: number) => Number(process.env[k] ?? d) || d;
// Per minute. auth = login/register per IP; ai = evaluation calls per user; default = everything else.
export const LIMITS = { auth: env('RATE_LIMIT_AUTH', 10), ai: env('RATE_LIMIT_AI', 30), default: env('RATE_LIMIT_DEFAULT', 120) } as const;
export type LimitKind = keyof typeof LIMITS;

export function hit(key: string, kind: LimitKind, now = Date.now()): { ok: boolean; retryAfter: number } {
  const max = LIMITS[kind];
  const k = `${kind}:${key}`;
  let b = buckets.get(k);
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + 60_000 };
    buckets.set(k, b);
  }
  b.count++;
  if (buckets.size > 50_000) for (const [kk, v] of buckets) if (v.reset <= now) buckets.delete(kk);
  return { ok: b.count <= max, retryAfter: Math.ceil((b.reset - now) / 1000) };
}
export function resetLimits() { buckets.clear(); }
