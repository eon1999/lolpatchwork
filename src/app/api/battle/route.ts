import { requireUser } from "@/lib/user";
import { pickPair } from "@/lib/battle";
import { toCard } from "@/lib/creations";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
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
    if (err instanceof Error && err.message === "BANNED") {
      return fail("BANNED", "Nope.", 403);
    }
    throw err;
  }
}
