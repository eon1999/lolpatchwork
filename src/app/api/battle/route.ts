import { requireUser } from "@/lib/user";
import { pickPair } from "@/lib/battle";
import { toCard } from "@/lib/creations";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/ratelimit";
import { ok, fail, tooMany, mapRouteError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const pairLimit = await rateLimit("pair", user.id);
    if (!pairLimit.allowed) return tooMany(pairLimit.retryAfterSec, "Too many pairs.");
    const pair = await pickPair(user.id);
    if (!pair) return fail("EMPTY_POOL", "No creations to battle yet.", 503);
    const authorA = (
      await db.select().from(users).where(eq(users.id, pair.a.userId)).limit(1)
    )[0];
    const authorB = (
      await db.select().from(users).where(eq(users.id, pair.b.userId)).limit(1)
    )[0];
    return ok({
      pairToken: pair.pairToken,
      coldStart: pair.coldStart,
      a: toCard(pair.a, authorA?.displayName ?? "unknown"),
      b: toCard(pair.b, authorB?.displayName ?? "unknown"),
    });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
