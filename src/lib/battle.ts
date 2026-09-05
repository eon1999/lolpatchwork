import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, type Creation } from "@/lib/db/schema";
import { issuePairToken } from "@/lib/pairToken";
import { currentWeekKey } from "@/lib/weeks";

const EIGHT_WEEKS = sql.raw("interval '8 weeks'");

type Pick = { id: string };

/** §2.7 — competitive matchups, even exposure, no self-votes, no repeats. */
export async function pickPair(voterId: string): Promise<{
  a: Creation;
  b: Creation;
  pairToken: string;
  coldStart: boolean;
} | null> {
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
  const coldStart = (poolSize ?? 0) < 20;
  const ordering = coldStart ? sql`random()` : sql`random() / (1 + battles)`;

  const load = async (ids: [string, string]): Promise<[Creation, Creation] | null> => {
    const rows = await db.select().from(creations).where(inArray(creations.id, ids));
    const a = rows.find((r) => r.id === ids[0]);
    const b = rows.find((r) => r.id === ids[1]);
    return a && b ? [a, b] : null;
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    const aPick = (
      await db.execute<Pick>(
        sql`select id from creations where ${baseFilter} order by ${ordering} limit 1`,
      )
    )[0];
    if (!aPick) return null;

    let bPick: Pick | undefined;
    for (const band of [200, 400, 100000]) {
      bPick = (
        await db.execute<Pick>(sql`
          select id from creations
          where ${baseFilter} and id != ${aPick.id}
            and abs(rating - (select rating from creations where id = ${aPick.id})) < ${band}
          order by ${ordering} limit 1
        `)
      )[0];
      if (bPick) break;
    }
    if (!bPick) return null;

    const [lo, hi] = aPick.id < bPick.id ? [aPick.id, bPick.id] : [bPick.id, aPick.id];
    const seen = (
      await db.execute<{ exists: boolean }>(sql`
        select exists(
          select 1 from battles
          where voter_id = ${voterId} and week_key = ${week} and a_id = ${lo} and b_id = ${hi}
        ) as exists
      `)
    )[0];
    if (seen?.exists) continue;

    const loaded = await load([lo, hi]);
    if (!loaded) return null;
    return {
      a: loaded[0],
      b: loaded[1],
      pairToken: issuePairToken({ a: lo, b: hi, week, voter: voterId }),
      coldStart,
    };
  }

  // 5 repeats seen: serve anyway; a 409 on vote makes the client refetch (SPEC §2.7).
  const aPick = (
    await db.execute<Pick>(
      sql`select id from creations where ${baseFilter} order by ${ordering} limit 1`,
    )
  )[0];
  if (!aPick) return null;
  const bPick = (
    await db.execute<Pick>(sql`
      select id from creations where ${baseFilter} and id != ${aPick.id} order by ${ordering} limit 1
    `)
  )[0];
  if (!bPick) return null;
  const [lo, hi] = aPick.id < bPick.id ? [aPick.id, bPick.id] : [bPick.id, aPick.id];
  const loaded = await load([lo, hi]);
  if (!loaded) return null;
  return {
    a: loaded[0],
    b: loaded[1],
    pairToken: issuePairToken({ a: lo, b: hi, week, voter: voterId }),
    coldStart,
  };
}
