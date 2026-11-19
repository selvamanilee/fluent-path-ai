// Fixed-window in-memory limiter. Suitable for a single instance; use Redis for horizontal scaling.
const buckets = new Map<string, { count: number; reset: number }>();
export const LIMITS = { auth: 10, ai: 30, default: 120 } as const;
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
