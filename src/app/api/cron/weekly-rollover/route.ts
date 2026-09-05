import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { closingWeekKey } from "@/lib/weeks";
import { weeklyStandings } from "@/lib/leaderboard";
import { LEADERBOARD_MIN_BATTLES } from "@/lib/wilson";
import { ok, fail } from "@/lib/api";

/** Vercel Cron, Mondays 00:00 UTC. Bearer CRON_SECRET. Idempotent (SPEC §2.10). */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return fail("FORBIDDEN", "Bad cron secret.", 401);
  }

  const closingWeek = closingWeekKey();
  const standings = await weeklyStandings(closingWeek);
  const top10 = standings
    .filter((s) => s.decisive >= LEADERBOARD_MIN_BATTLES)
    .sort(
      (x, y) =>
        y.score - x.score || y.wins - x.wins || y.battles - x.battles || x.creationId.localeCompare(y.creationId),
    )
    .slice(0, 10);

  if (top10.length > 0) {
    await db.execute(sql`
      insert into hall_of_fame (week_key, rank, creation_id, wins, losses, score)
      select * from (values ${sql.join(
        top10.map((s, i) => sql`(${closingWeek}::text, ${i + 1}::smallint, ${s.creationId}::uuid, ${s.wins}::int, ${s.losses}::int, ${s.score}::double precision)`),
        sql`, `,
      )}) as t(week_key, rank, creation_id, wins, losses, score)
      on conflict (week_key, rank) do nothing
    `);
  }

  await db.execute(sql`
    update drafts set status = 'expired'
    where expires_at < now() and status = 'active'
  `);

  return ok({ closingWeek, inducted: top10.length });
}
