import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { getChampion } from "@/lib/champions";

export async function GET() {
  const rows = (
    await db.execute<{
      week_key: string;
      rank: number;
      creation_id: string;
      name: string;
      tagline: string | null;
      model_id: string;
      wins: number;
      losses: number;
      score: number;
    }>(sql`
      select h.week_key, h.rank, h.creation_id, c.name, c.tagline, c.model_id,
             h.wins, h.losses, h.score
      from hall_of_fame h
      join creations c on c.id = h.creation_id
      where h.week_key in (select distinct week_key from hall_of_fame order by week_key desc limit 12)
      order by h.week_key desc, h.rank asc
    `)
  );

  const weeks: {
    week: string;
    entries: {
      rank: number;
      creationId: string;
      name: string;
      tagline: string | null;
      modelName: string;
      wins: number;
      losses: number;
      score: number;
    }[];
  }[] = [];

  for (const r of rows) {
    let bucket = weeks.find((w) => w.week === r.week_key);
    if (!bucket) {
      bucket = { week: r.week_key, entries: [] };
      weeks.push(bucket);
    }
    bucket.entries.push({
      rank: r.rank,
      creationId: r.creation_id,
      name: r.name,
      tagline: r.tagline,
      modelName: getChampion(r.model_id)?.name ?? r.model_id,
      wins: r.wins,
      losses: r.losses,
      score: r.score,
    });
  }
  return ok({ weeks });
}
