import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leaderboardForWeek } from "@/lib/leaderboard";
import { currentWeekKey } from "@/lib/weeks";
import { getChampion } from "@/lib/champions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const week = currentWeekKey();
  const board = await leaderboardForWeek(week).catch(() => null);

  type HofRow = { week_key: string; rank: number; name: string; creation_id: string; wins: number; losses: number };
  const hof: HofRow[] = await db
    .execute<HofRow>(sql`
      select h.week_key, h.rank, c.name, h.creation_id, h.wins, h.losses
      from hall_of_fame h join creations c on c.id = h.creation_id
      where h.week_key in (select distinct week_key from hall_of_fame order by week_key desc limit 4)
      order by h.week_key desc, h.rank asc limit 40
    `)
    .catch(() => [] as HofRow[]);

  return (
    <div className="py-8">
      <h1 className="font-display text-3xl tracking-wide text-gold-bright">LEADERBOARD</h1>
      <p className="mb-6 mt-1 text-xs text-muted">
        week {week} · Wilson lower bound, min 8 battles · resets Mondays 00:00 UTC
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          {!board || board.ranked.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              Not enough battles this week yet. Go fight about it.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge/60 text-left text-xs uppercase tracking-widest text-muted">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Creation</th>
                  <th className="py-2 pr-2">W-L</th>
                  <th className="py-2 pr-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {board.ranked.map((s, i) => (
                  <tr key={s.creationId} className="border-b border-edge/30">
                    <td className="py-2.5 pr-2 font-display text-lg text-gold/80">{i + 1}</td>
                    <td className="py-2.5 pr-2">
                      <Link href={`/c/${s.creationId}`} className="font-semibold text-gold-bright hover:text-gold">
                        {s.name}
                      </Link>
                      <span className="ml-2 text-xs text-muted">
                        {getChampion(s.modelId)?.name ?? s.modelId}&apos;s body
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-muted">
                      {s.wins}-{s.losses}
                    </td>
                    <td className="py-2.5 pr-2 text-right font-mono text-xs text-gold/80">
                      {s.score.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-edge/60 bg-panel p-4">
            <h2 className="font-display text-lg tracking-wide text-gold">MOST BATTLED</h2>
            <ol className="mt-2 space-y-1.5 text-sm">
              {board?.mostBattled.length ? (
                board.mostBattled.map((s, i) => (
                  <li key={s.creationId} className="flex items-baseline justify-between gap-2">
                    <Link href={`/c/${s.creationId}`} className="truncate text-gold-bright/90 hover:text-gold">
                      {i + 1}. {s.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">{s.battles} battles</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted">nothing yet</li>
              )}
            </ol>
          </section>
          <section className="rounded-lg border border-edge/60 bg-panel p-4">
            <h2 className="font-display text-lg tracking-wide text-gold">MOST UPVOTED</h2>
            <ol className="mt-2 space-y-1.5 text-sm">
              {board?.mostUpvoted.length ? (
                board.mostUpvoted.map((s, i) => (
                  <li key={s.creation_id} className="flex items-baseline justify-between gap-2">
                    <Link href={`/c/${s.creation_id}`} className="truncate text-gold-bright/90 hover:text-gold">
                      {i + 1}. {s.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">▲ {s.weekly_upvotes}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted">nothing yet</li>
              )}
            </ol>
          </section>
        </div>
      </div>

      {hof.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl tracking-wide text-gold-bright">HALL OF FAME</h2>
          <p className="mb-3 mt-1 text-xs text-muted">top 10 of each closing week, immortalized</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(
              hof.reduce<Record<string, typeof hof>>((acc, r) => {
                (acc[r.week_key] ??= []).push(r);
                return acc;
              }, {}),
            ).map(([weekKey, rows]) => (
              <div key={weekKey} className="rounded-lg border border-edge/60 bg-panel p-3">
                <div className="mb-2 font-display text-sm tracking-widest text-gold/80">{weekKey}</div>
                <ol className="space-y-1 text-xs">
                  {rows.slice(0, 5).map((r) => (
                    <li key={r.rank} className="flex items-baseline justify-between gap-2">
                      <Link href={`/c/${r.creation_id}`} className="truncate text-gold-bright/80 hover:text-gold">
                        {r.rank}. {r.name}
                      </Link>
                      <span className="shrink-0 text-muted">
                        {r.wins}-{r.losses}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
