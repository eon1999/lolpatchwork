import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, upvotes, users } from "@/lib/db/schema";
import { toCard } from "@/lib/creations";
import { getUser, clientIpHash } from "@/lib/user";
import { rateLimit } from "@/lib/ratelimit";
import { ok, fail, tooMany, isUuid, mapRouteError } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const limited = await rateLimit("read", await clientIpHash());
    if (!limited.allowed) return tooMany(limited.retryAfterSec, "Slow down.");
    const { id } = await ctx.params;
    if (!isUuid(id)) return fail("NOT_FOUND", "Creation not found.", 404);
  const rows = await db
    .select({ creation: creations, authorName: users.displayName })
    .from(creations)
    .innerJoin(users, eq(users.id, creations.userId))
    .where(eq(creations.id, id))
    .limit(1);
  const row = rows[0];
  if (!row || row.creation.isHidden) return fail("NOT_FOUND", "Creation not found.", 404);

  const viewer = await getUser();
  let viewerUpvoted = false;
  if (viewer) {
    const uv = await db
      .select()
      .from(upvotes)
      .where(and(eq(upvotes.creationId, id), eq(upvotes.userId, viewer.id)))
      .limit(1);
    viewerUpvoted = uv.length > 0;
  }
  return ok({ ...toCard(row.creation, row.authorName), viewerUpvoted });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
