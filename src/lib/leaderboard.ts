import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { wilsonLowerBound, LEADERBOARD_MIN_BATTLES } from "@/lib/wilson";
import { weekKeyToDate } from "@/lib/weeks";

export type WeeklyStanding = {
  creationId: string;
  name: string;
  tagline: string | null;
  userId: string;
  modelId: string;
  wins: number;
  losses: number;
  battles: number;
  decisive: number;
  score: number;
};

/** Weekly wins/losses derived from battles filtered by week_key (SPEC §1.6/§2.4). */
export async function weeklyStandings(week: string): Promise<WeeklyStanding[]> {
  const rows = (
    await db.execute<{
      creation_id: string;
      name: string;
      tagline: string | null;
      user_id: string;
      model_id: string;
      wins: number;
      losses: number;
      battles: number;
    }>(sql`
      with s as (
        select a_id as cid, winner_id from battles where week_key = ${week}
        union all
        select b_id as cid, winner_id from battles where week_key = ${week}
      )
      select c.id as creation_id, c.name, c.tagline, c.user_id, c.model_id,
        count(*) filter (where s.winner_id = s.cid)::int as wins,
        count(*) filter (where s.winner_id is not null and s.winner_id <> s.cid)::int as losses,
        count(*)::int as battles
      from s join creations c on c.id = s.cid
      where not c.is_hidden
      group by c.id, c.name, c.tagline, c.user_id, c.model_id
    `)
  );

  return rows.map((r) => {
    const decisive = r.wins + r.losses;
    return {
      creationId: r.creation_id,
      name: r.name,
      tagline: r.tagline,
      userId: r.user_id,
      modelId: r.model_id,
      wins: r.wins,
      losses: r.losses,
      battles: r.battles,
      decisive,
      score: wilsonLowerBound(r.wins, decisive),
    };
  });
}

export async function leaderboardForWeek(week: string) {
  const standings = await weeklyStandings(week);
  const ranked = standings
    .filter((s) => s.decisive >= LEADERBOARD_MIN_BATTLES)
    .sort(
      (x, y) => y.score - x.score || y.wins - x.wins || y.battles - x.battles || x.creationId.localeCompare(y.creationId),
    )
    .slice(0, 50);
  const mostBattled = [...standings]
    .sort((x, y) => y.battles - x.battles || y.wins - x.wins || x.creationId.localeCompare(y.creationId))
    .slice(0, 10);

  const monday = weekKeyToDate(week).toISOString();
  const nextMonday = new Date(weekKeyToDate(week).getTime() + 7 * 86_400_000).toISOString();
  const mostUpvoted = (
    await db.execute<{ creation_id: string; name: string; weekly_upvotes: number }>(sql`
      select c.id as creation_id, c.name,
        (select count(*) from upvotes uv
          where uv.creation_id = c.id and uv.created_at >= ${monday}::timestamptz and uv.created_at < ${nextMonday}::timestamptz)::int as weekly_upvotes
      from creations c
      where not c.is_hidden and c.week_key = ${week}
      order by weekly_upvotes desc, c.created_at desc
      limit 10
    `)
  ).filter((r) => r.weekly_upvotes > 0);

  return { week, ranked, mostBattled, mostUpvoted };
}
