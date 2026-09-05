import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export const RATE_LIMITS = {
  draft: { limit: 10, windowSec: 3600 },
  publish: { limit: 10, windowSec: 3600 },
  battleVote: { limit: 120, windowSec: 3600 },
  upvote: { limit: 200, windowSec: 3600 },
  comment: { limit: 20, windowSec: 3600 },
  auth: { limit: 20, windowSec: 900 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

/**
 * Sliding-window rate limit over Upstash Redis. Falls back to "allow" when
 * Redis is not configured (local dev without Upstash).
 */
export async function rateLimit(
  name: RateLimitName,
  identity: string,
): Promise<{ allowed: boolean }> {
  if (!redis) return { allowed: true };
  const { limit, windowSec } = RATE_LIMITS[name];
  const key = `rl:${name}:${identity}`;
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const member = `${now}:${Math.random().toString(36).slice(2)}`;
  const count = (await Promise.all([
    redis.zremrangebyscore(key, 0, now - windowMs),
    redis.zcard(key),
  ])) as [number, number];
  if (count[1] >= limit) return { allowed: false };
  await Promise.all([redis.zadd(key, { score: now, member }), redis.expire(key, windowSec)]);
  return { allowed: true };
}

export async function mirrorDraft(id: string, state: unknown): Promise<void> {
  if (!redis) return;
  await redis.set(`draft:${id}`, JSON.stringify(state), { ex: 1800 });
}

export async function readDraftMirror<T>(id: string): Promise<T | null> {
  if (!redis) return null;
  const raw = (await redis.get(`draft:${id}`)) as string | null;
  return raw ? (JSON.parse(raw) as T) : null;
}
