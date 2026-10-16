/**
 * Simple sliding-window rate limiter (per serverless instance). Good enough to stop
 * casual abuse of a concept; swap for Upstash/KV for a shared limit in production.
 */
const buckets = new Map<string, number[]>();
let globalHits: number[] = [];

export const LIMITS = {
  perIp: { max: 20, windowMs: 10 * 60 * 1000 },
  global: { max: 400, windowMs: 60 * 1000 },
  maxInputChars: 1500,
  maxUserTurns: 20,
  maxTranscriptChars: 60_000,
};

export function checkRateLimit(ip: string, now = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
  const cutoff = now - LIMITS.perIp.windowMs;
  const arr = (buckets.get(ip) ?? []).filter((t) => t > cutoff);
  globalHits = globalHits.filter((t) => t > now - LIMITS.global.windowMs);
  if (globalHits.length >= LIMITS.global.max) return { ok: false, retryAfterSec: 60 };
  if (arr.length >= LIMITS.perIp.max) return { ok: false, retryAfterSec: Math.ceil((arr[0] + LIMITS.perIp.windowMs - now) / 1000) };
  arr.push(now);
  buckets.set(ip, arr);
  globalHits.push(now);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => t > cutoff)) buckets.delete(k);
  }
  return { ok: true };
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}
