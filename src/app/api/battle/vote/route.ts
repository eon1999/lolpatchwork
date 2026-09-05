import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { battles, creations } from "@/lib/db/schema";
import { requireUser } from "@/lib/user";
import { parsePairToken } from "@/lib/pairToken";
import { updateRatings } from "@/lib/elo";
import { currentWeekKey } from "@/lib/weeks";
import { rateLimit } from "@/lib/ratelimit";
import { ok, fail, tooMany, readJson, mapRouteError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const limit = await rateLimit("battleVote", user.id);
    if (!limit.allowed) return tooMany(limit.retryAfterSec, "Too many votes.");

    const body = await readJson<{
      pairToken?: string;
      winner?: "a" | "b" | "skip";
    }>(req);
    if (!body.pairToken || !body.winner) {
      return fail("BAD_REQUEST", "Missing pairToken or winner.", 400);
    }
    if (!["a", "b", "skip"].includes(body.winner)) {
      return fail("BAD_REQUEST", "winner must be a, b, or skip.", 400);
    }

    const payload = parsePairToken(body.pairToken);
    if (!payload || payload.voter !== user.id) {
      return fail("BAD_TOKEN", "Invalid pair token.", 403);
    }
    if (payload.week !== currentWeekKey()) {
      return fail("STALE_PAIR", "This pair expired. Refetch.", 409);
    }

    const rows = await db
      .select()
      .from(creations)
      .where(sql`${creations.id} in (${payload.a}::uuid, ${payload.b}::uuid)`);
    const a = rows.find((r) => r.id === payload.a);
    const b = rows.find((r) => r.id === payload.b);
    if (!a || !b || a.isHidden || b.isHidden) {
      return fail("NOT_FOUND", "Creation missing.", 404);
    }
    if (a.userId === user.id || b.userId === user.id) {
      return fail("SELF_VOTE", "You cannot vote on your own creation.", 403);
    }

    const winner = body.winner;
    const winnerId = winner === "a" ? a.id : winner === "b" ? b.id : null;

    // Idempotency guard: unique (voter, a, b, week). AC §1.5.
    const inserted = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(battles)
        .values({ aId: payload.a, bId: payload.b, winnerId, voterId: user.id, weekKey: payload.week })
        .onConflictDoNothing()
        .returning();
      if (rows.length === 0) return false;

      await tx
        .update(creations)
        .set({ battles: sql`${creations.battles} + 1` })
        .where(sql`${creations.id} in (${payload.a}::uuid, ${payload.b}::uuid)`);

      if (winner !== "skip" && winnerId) {
        const [newA, newB] = updateRatings(a.rating, b.rating, winner);
        await tx.update(creations).set({ rating: newA }).where(eq(creations.id, a.id));
        await tx.update(creations).set({ rating: newB }).where(eq(creations.id, b.id));
        await tx
          .update(creations)
          .set({ wins: sql`${creations.wins} + 1` })
          .where(eq(creations.id, winnerId));
      }
      return true;
    });

    const splitRows = (
      await db.execute<{ a: number; b: number; total: number }>(sql`
        select
          count(*) filter (where winner_id = ${payload.a}::uuid)::int as a,
          count(*) filter (where winner_id = ${payload.b}::uuid)::int as b,
          count(*)::int as total
        from battles
        where a_id = ${payload.a}::uuid and b_id = ${payload.b}::uuid
      `)
    )[0];
    const decisive = splitRows.a + splitRows.b;
    const aPct = decisive > 0 ? Math.round((splitRows.a / decisive) * 100) : 50;

    return ok({
      counted: inserted,
      split: { aPercent: aPct, bPercent: 100 - aPct, total: splitRows.total },
    });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
