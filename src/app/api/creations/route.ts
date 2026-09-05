import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, upvotes, users } from "@/lib/db/schema";
import { toCard } from "@/lib/creations";
import { getUser, clientIpHash } from "@/lib/user";
import { currentWeekKey, weekKeyToDate } from "@/lib/weeks";
import { rateLimit } from "@/lib/ratelimit";
import { ok, tooMany, mapRouteError } from "@/lib/api";

type Sort = "new" | "top" | "week";
const EIGHT_WEEKS_MS = 8 * 7 * 24 * 3600 * 1000;

type Cursor = { c?: string; id?: string; s?: number };

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}
function decodeCursor(s: string | null): Cursor | null {
  if (!s) return null;
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as Cursor;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const limited = await rateLimit("read", await clientIpHash());
    if (!limited.allowed) return tooMany(limited.retryAfterSec, "Slow down.");
    const url = new URL(req.url);
  const sort = (url.searchParams.get("sort") ?? "new") as Sort;
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 24), 1), 50);
  const all = url.searchParams.get("all") === "1";
  const viewer = await getUser();
  const weekStart = weekKeyToDate(currentWeekKey()).toISOString();

  const weeklyUpvotes = sql<number>`(
    select count(*)::int from ${upvotes}
    where ${upvotes.creationId} = ${creations.id} and ${upvotes.createdAt} >= ${weekStart}::timestamptz
  )`;

  const conditions = [eq(creations.isHidden, false)];
  if (!all) conditions.push(gt(creations.createdAt, new Date(Date.now() - EIGHT_WEEKS_MS)));

  if (sort === "new") {
    if (cursor?.c && cursor?.id) {
      conditions.push(
        sql`(${creations.createdAt}, ${creations.id}) < (${new Date(cursor.c).toISOString()}::timestamptz, ${cursor.id}::uuid)`,
      );
    }
  } else if (sort === "week") {
    if (cursor?.s !== undefined && cursor?.id) {
      conditions.push(sql`(${weeklyUpvotes}, ${creations.id}) < (${cursor.s}, ${cursor.id}::uuid)`);
    }
  } else {
    if (cursor?.s !== undefined && cursor?.id) {
      conditions.push(
        sql`(${creations.upvotes}, ${creations.id}) < (${cursor.s}, ${cursor.id}::uuid)`,
      );
    }
  }

  const orderBy =
    sort === "new"
      ? [desc(creations.createdAt), desc(creations.id)]
      : sort === "week"
        ? [desc(weeklyUpvotes), desc(creations.id)]
        : [desc(creations.upvotes), desc(creations.id)];

  const rows = await db
    .select({ creation: creations, authorName: users.displayName, weeklyUpvotes })
    .from(creations)
    .innerJoin(users, eq(users.id, creations.userId))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = page[page.length - 1];

  const viewerUpvoted = viewer
    ? new Set(
        (
          await db
            .select({ creationId: upvotes.creationId })
            .from(upvotes)
            .where(
              sql`${upvotes.userId} = ${viewer.id} and ${upvotes.creationId} in (${sql.join(
                page.map((r) => sql`${r.creation.id}::uuid`),
                sql`, `,
              )})`,
            )
        ).map((r) => r.creationId),
      )
    : new Set<string>();

  const items = page.map((r) => ({
    ...toCard(r.creation, r.authorName),
    viewerUpvoted: viewerUpvoted.has(r.creation.id),
    weeklyUpvotes: Number(r.weeklyUpvotes),
  }));

  let nextCursor: string | null = null;
  if (hasMore && last) {
    nextCursor =
      sort === "new"
        ? encodeCursor({ c: last.creation.createdAt.toISOString(), id: last.creation.id })
        : sort === "week"
          ? encodeCursor({ s: Number(last.weeklyUpvotes), id: last.creation.id })
          : encodeCursor({ s: last.creation.upvotes, id: last.creation.id });
  }

  return ok({ items, nextCursor });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
