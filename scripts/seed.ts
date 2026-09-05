/**
 * Seed staging: ~30 users, ~200 creations, ~2000 battles with consistent Elo,
 * plus upvotes. Idempotent: truncates seeded tables first (SPEC §2.11).
 * Run: DATABASE_URL=... npm run seed
 */
import { randomInt } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { battles, creations, drafts, upvotes, users } from "../src/lib/db/schema";
import { CHAMPION_IDS, PATCH } from "../src/lib/champions";
import { shuffle } from "../src/lib/draft";
import { updateRatings } from "../src/lib/elo";
import { currentWeekKey, weekKeyOf, weekKeyToDate } from "../src/lib/weeks";
import { wilsonLowerBound } from "../src/lib/wilson";

const N_USERS = 30;
const N_CREATIONS = 200;
const N_BATTLES = 2000;

const PREFIXES = ["Feral", "Unkillable", "Cursed", "Bargain-Bin", "Off-Brand", "Discount", "Homemade", "Contraband", "Void-Touched", "Genuine"];
const SUFFIXES = ["Accident", "Menace", "Experiment", "Prototype", "Warranty Void", "Lawsuit", "Shrine", "Nightmare", "Deal", "Special"];

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(arr.length)];
}

function makeName(modelName: string): string {
  const style = randomInt(3);
  if (style === 0) return `${pick(PREFIXES)} ${modelName}`.slice(0, 24);
  if (style === 1) return `${modelName} ${pick(SUFFIXES)}`.slice(0, 24);
  return `${modelName.slice(0, 10)}${pick(SUFFIXES).slice(0, 8)}`.slice(0, 24);
}

const TAGLINES = [
  "built to lose lane and win the game",
  "held together by hopes and dreams",
  "do not perceive me",
  "certified 1v9 machine (unverified)",
  "the jungler's problem now",
  "mathematically balanced",
  "built in a cave, with a box of scraps",
  "its only weakness is everything",
  "",
];

async function main() {
  console.log("Seeding…");
  await db.execute(sql`
    truncate table hall_of_fame, reports, battle_comments, battles, upvotes, creations, drafts, users cascade
  `);

  const userIds: string[] = [];
  for (let i = 0; i < N_USERS; i++) {
    const row = (
      await db
        .insert(users)
        .values({ displayName: `Seed Poro ${10 + i}`, lastIpHash: null })
        .returning()
    )[0];
    userIds.push(row.id);
  }

  type Row = typeof creations.$inferInsert;
  const creationRows: Row[] = [];
  for (let i = 0; i < N_CREATIONS; i++) {
    const userId = pick(userIds);
    const dealt = shuffle(CHAMPION_IDS).slice(0, 6);
    // random valid assignment
    const slots = shuffle(dealt);
    const [model, passive, q, w, e, r] = slots;
    const createdAt = new Date(Date.now() - randomInt(8 * 7 * 24 * 3600 * 1000));
    const draftRow = (
      await db
        .insert(drafts)
        .values({
          userId,
          championIds: dealt,
          assignments: { model, passive, q, w, e, r },
          revealedCount: 6,
          status: "published",
          createdAt,
          expiresAt: new Date(createdAt.getTime() + 30 * 60_000),
        })
        .returning()
    )[0];
    creationRows.push({
      draftId: draftRow.id,
      userId,
      name: makeName(pick(["Yuumi", "Lux", "Aatrox", "Teemo", "Blitzcrank", "Sona", "Urgot", "Riven"])),
      tagline: pick(TAGLINES) || null,
      modelId: model,
      passiveId: passive,
      qId: q,
      wId: w,
      eId: e,
      rId: r,
      patch: PATCH,
      weekKey: weekKeyOf(createdAt),
      createdAt,
    });
  }
  const inserted = await db.insert(creations).values(creationRows).returning();
  console.log(`Inserted ${inserted.length} creations.`);

  // Ratings/counters in memory, then flush once — consistent Elo history.
  const rating = new Map<string, number>(inserted.map((c) => [c.id, 1200]));
  const wins = new Map<string, number>(inserted.map((c) => [c.id, 0]));
  const battleCount = new Map<string, number>(inserted.map((c) => [c.id, 0]));

  // Bias battles toward the current week and a featured pool so the
  // leaderboard (min 8 weekly battles) and hall of fame have content.
  const featured = inserted.slice(0, 60);
  const pickBattler = () => (Math.random() < 0.6 ? pick(featured) : pick(inserted));
  const battleWhen = () =>
    Math.random() < 0.7
      ? new Date(Date.now() - randomInt(6 * 24 * 3600 * 1000))
      : new Date(Date.now() - randomInt(8 * 7 * 24 * 3600 * 1000));

  const battleRows: (typeof battles.$inferInsert)[] = [];
  const seenPairs = new Set<string>();
  let guard = 0;
  while (battleRows.length < N_BATTLES && guard < N_BATTLES * 20) {
    guard++;
    const a = pickBattler();
    let b = pickBattler();
    while (b.id === a.id) b = pickBattler();
    const voter = pick(userIds);
    const skip = Math.random() < 0.08;
    const [lo, hi] = a.id < b.id ? [a, b] : [b, a];
    const when = battleWhen();
    const week = weekKeyOf(when);
    const key = `${voter}:${lo.id}:${hi.id}:${week}`;
    if (seenPairs.has(key)) continue; // unique index (voter, a, b, week)
    seenPairs.add(key);
    const winner = skip ? null : Math.random() < 0.5 ? a : b;
    battleRows.push({
      aId: lo.id,
      bId: hi.id,
      winnerId: winner?.id ?? null,
      voterId: voter,
      weekKey: week,
      createdAt: when,
    });
    battleCount.set(a.id, battleCount.get(a.id)! + 1);
    battleCount.set(b.id, battleCount.get(b.id)! + 1);
    if (winner) {
      wins.set(winner.id, wins.get(winner.id)! + 1);
      const [na, nb] = updateRatings(rating.get(a.id)!, rating.get(b.id)!, winner.id === a.id ? "a" : "b");
      rating.set(a.id, na);
      rating.set(b.id, nb);
    }
  }
  for (let i = 0; i < battleRows.length; i += 500) {
    await db.insert(battles).values(battleRows.slice(i, i + 500));
  }
  console.log(`Inserted ${battleRows.length} battles.`);

  for (const c of inserted) {
    await db
      .update(creations)
      .set({
        rating: rating.get(c.id)!,
        wins: wins.get(c.id)!,
        battles: battleCount.get(c.id)!,
      })
      .where(sql`${creations.id} = ${c.id}`);
  }

  const upvoteRows: (typeof upvotes.$inferInsert)[] = [];
  for (const c of inserted) {
    const n = randomInt(8);
    for (const uid of shuffle(userIds).slice(0, n)) {
      upvoteRows.push({ creationId: c.id, userId: uid, createdAt: new Date() });
    }
  }
  await db.insert(upvotes).values(upvoteRows).onConflictDoNothing();
  for (const c of inserted) {
    await db.execute(sql`
      update creations set upvotes = (select count(*) from upvotes where creation_id = ${c.id}) where id = ${c.id}
    `);
  }
  console.log(`Inserted ${upvoteRows.length} upvotes.`);

  // Hall of fame for last week (if it has battles)
  const lastWeek = weekKeyOf(new Date(Date.now() - 7 * 86_400_000));
  const standings = (
    await db.execute<{ creation_id: string; wins: number; losses: number }>(sql`
      with s as (
        select a_id as cid, winner_id from battles where week_key = ${lastWeek}
        union all
        select b_id as cid, winner_id from battles where week_key = ${lastWeek}
      )
      select creation_id, wins, losses from (
        select c.id as creation_id,
          count(*) filter (where s.winner_id = s.cid)::int as wins,
          count(*) filter (where s.winner_id is not null and s.winner_id <> s.cid)::int as losses
        from s join creations c on c.id = s.cid
        group by c.id
      ) t where wins + losses >= 8
    `)
  )
    .map((r) => ({ ...r, score: wilsonLowerBound(r.wins, r.wins + r.losses) }))
    .sort((x, y) => y.score - x.score || y.wins - x.wins)
    .slice(0, 10);

  if (standings.length > 0) {
    await db.execute(sql`
      insert into hall_of_fame (week_key, rank, creation_id, wins, losses, score)
      select * from (values ${sql.join(
        standings.map((s, i) => sql`(${lastWeek}::text, ${i + 1}::smallint, ${s.creation_id}::uuid, ${s.wins}::int, ${s.losses}::int, ${s.score}::double precision)`),
        sql`, `,
      )}) as t(week_key, rank, creation_id, wins, losses, score)
      on conflict do nothing
    `);
    console.log(`Inducted ${standings.length} into ${lastWeek} hall of fame.`);
  }

  console.log(`Current week: ${currentWeekKey()} (starts ${weekKeyToDate(currentWeekKey()).toISOString()})`);
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
