import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, type Creation } from "@/lib/db/schema";
import { issuePairToken } from "@/lib/pairToken";
import { currentWeekKey } from "@/lib/weeks";

const EIGHT_WEEKS = sql.raw("interval '8 weeks'");

type Pick = { id: string };

/**
 * "ok"     — a fresh pair the voter has never seen (any week).
 * "pool"   — not enough eligible creations to form any pair.
 * "seen"   — pool exists, but this voter has already judged every pair in it.
 */
export type PairPick =
  | { status: "ok"; a: Creation; b: Creation; pairToken: string; coldStart: boolean }
  | { status: "none"; reason: "pool" | "seen" };

/** §2.7 — competitive matchups, even exposure, no self-votes, no repeats. */
export async function pickPair(voterId: string): Promise<PairPick> {
  const week = currentWeekKey();
  const baseFilter = sql`
    not is_hidden
    and created_at > now() - ${EIGHT_WEEKS}
    and user_id != ${voterId}
  `;

  const poolSize = (
    await db.execute<{ count: number }>(
      sql`select count(*)::int as count from creations where ${baseFilter}`,
    )
  )[0]?.count;
  if ((poolSize ?? 0) < 2) return { status: "none", reason: "pool" };
  const coldStart = poolSize < 20;
  const ordering = coldStart ? sql`random()` : sql`random() / (1 + battles)`;

  const load = async (ids: [string, string]): Promise<[Creation, Creation] | null> => {
    const rows = await db.select().from(creations).where(inArray(creations.id, ids));
    const a = rows.find((r) => r.id === ids[0]);
    const b = rows.find((r) => r.id === ids[1]);
    return a && b ? [a, b] : null;
  };

  const build = async (
    lo: string,
    hi: string,
  ): Promise<PairPick> => {
    const loaded = await load([lo, hi]);
    if (!loaded) return { status: "none", reason: "pool" };
    return {
      status: "ok",
      a: loaded[0],
      b: loaded[1],
      pairToken: issuePairToken({ a: lo, b: hi, week, voter: voterId }),
      coldStart,
    };
  };

  // A pair counts as seen if the voter has a battle row on it in ANY week —
  // battles store the canonical (a_id < b_id) ordering, so test both sides.
  const unseenBy = (id: string) => sql`
    not exists (
      select 1 from battles bt
      where bt.voter_id = ${voterId}
        and bt.a_id = least(creations.id, ${id}::uuid)
        and bt.b_id = greatest(creations.id, ${id}::uuid)
    )
  `;

  for (let attempt = 0; attempt < 5; attempt++) {
    const aPick = (
      await db.execute<Pick>(
        sql`select id from creations where ${baseFilter} order by ${ordering} limit 1`,
      )
    )[0];
    if (!aPick) return { status: "none", reason: "pool" };

    for (const band of [200, 400, 100000]) {
      const bPick = (
        await db.execute<Pick>(sql`
          select id from creations
          where ${baseFilter} and id != ${aPick.id}
            and abs(rating - (select rating from creations where id = ${aPick.id})) < ${band}
            and ${unseenBy(aPick.id)}
          order by ${ordering} limit 1
        `)
      )[0];
      if (!bPick) continue;
      const [lo, hi] = aPick.id < bPick.id ? [aPick.id, bPick.id] : [bPick.id, aPick.id];
      return build(lo, hi);
    }
  }

  // Weighted picks kept colliding with seen pairs. Serve ANY fresh pair,
  // ignoring rating bands and exposure weighting — but never a repeat.
  const fallback = (
    await db.execute<{ a: string; b: string }>(sql`
      select a.id as a, b.id as b
      from creations a
      join creations b on a.id < b.id
      where not a.is_hidden and a.created_at > now() - ${EIGHT_WEEKS} and a.user_id != ${voterId}
        and not b.is_hidden and b.created_at > now() - ${EIGHT_WEEKS} and b.user_id != ${voterId}
        and not exists (
          select 1 from battles bt
          where bt.voter_id = ${voterId} and bt.a_id = a.id and bt.b_id = b.id
        )
      order by random()
      limit 1
    `)
  )[0];
  if (!fallback) return { status: "none", reason: "seen" };
  return build(fallback.a, fallback.b);
}
