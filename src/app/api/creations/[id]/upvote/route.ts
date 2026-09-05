import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, upvotes } from "@/lib/db/schema";
import { requireUser } from "@/lib/user";
import { rateLimit } from "@/lib/ratelimit";
import { ok, fail, tooMany, mapRouteError } from "@/lib/api";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const limit = await rateLimit("upvote", user.id);
    if (!limit.allowed) return tooMany(limit.retryAfterSec, "Easy there.");

    const target = (
      await db.select().from(creations).where(eq(creations.id, id)).limit(1)
    )[0];
    if (!target || target.isHidden) return fail("NOT_FOUND", "Creation not found.", 404);

    const result = await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(upvotes)
        .where(and(eq(upvotes.creationId, id), eq(upvotes.userId, user.id)))
        .limit(1);
      if (existing.length > 0) {
        await tx
          .delete(upvotes)
          .where(and(eq(upvotes.creationId, id), eq(upvotes.userId, user.id)));
        const updated = (
          await tx
            .update(creations)
            .set({ upvotes: sql`greatest(${creations.upvotes} - 1, 0)` })
            .where(eq(creations.id, id))
            .returning()
        )[0];
        return { upvoted: false, upvotes: updated.upvotes };
      }
      await tx.insert(upvotes).values({ creationId: id, userId: user.id });
      const updated = (
        await tx
          .update(creations)
          .set({ upvotes: sql`${creations.upvotes} + 1` })
          .where(eq(creations.id, id))
          .returning()
      )[0];
      return { upvoted: true, upvotes: updated.upvotes };
    });

    return ok(result);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
