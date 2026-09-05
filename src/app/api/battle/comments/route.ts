import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser, clientIpHash } from "@/lib/user";
import { parsePairToken } from "@/lib/pairToken";
import { rateLimit } from "@/lib/ratelimit";
import { isCleanText, GENERIC_REJECT_MESSAGE } from "@/lib/profanity";
import { ok, fail, tooMany, readJson, mapRouteError } from "@/lib/api";

const COMMENTS_ENABLED = process.env.ENABLE_BATTLE_COMMENTS === "1";

export async function GET(req: Request) {
  try {
    const limited = await rateLimit("read", await clientIpHash());
    if (!limited.allowed) return tooMany(limited.retryAfterSec, "Slow down.");
    const url = new URL(req.url);
    const token = url.searchParams.get("pairToken");
    if (!token) return fail("BAD_REQUEST", "Missing pairToken.", 400);
    const payload = parsePairToken(token);
    if (!payload) return fail("BAD_TOKEN", "Invalid pair token.", 403);
    const pair = `${payload.a}:${payload.b}`;
    const rows = (
      await db.execute<{ id: string; body: string; display_name: string; created_at: string }>(sql`
        select bc.id, bc.body, u.display_name, bc.created_at
        from battle_comments bc join users u on u.id = bc.user_id
        where bc.battle_pair = ${pair} and not bc.is_hidden
        order by bc.created_at desc limit 50
      `)
    );
    return ok({ items: rows.reverse() }, {
      headers: { "cache-control": "public, max-age=0, s-maxage=15, stale-while-revalidate=60" },
    });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    if (!COMMENTS_ENABLED) return fail("DISABLED", "Comments are turned off.", 403);
    const user = await requireUser();
    const limit = await rateLimit("comment", user.id);
    if (!limit.allowed) return tooMany(limit.retryAfterSec, "Too chatty.");

    const body = await readJson<{ pairToken?: string; body?: string }>(req);
    const payload = body.pairToken ? parsePairToken(body.pairToken) : null;
    if (!payload || payload.voter !== user.id) {
      return fail("BAD_TOKEN", "Invalid pair token.", 403);
    }
    const text = (body.body ?? "").trim();
    if (text.length < 1 || text.length > 200) {
      return fail("BAD_LENGTH", "Comment must be 1-200 characters.", 400);
    }
    if (!isCleanText(text)) return fail("REJECTED_TEXT", GENERIC_REJECT_MESSAGE, 400);

    const inserted = (
      await db.execute<{ id: string }>(sql`
        insert into battle_comments (battle_pair, user_id, body)
        values (${`${payload.a}:${payload.b}`}, ${user.id}, ${text})
        returning id
      `)
    )[0];
    return ok({ id: inserted.id }, { status: 201 });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
