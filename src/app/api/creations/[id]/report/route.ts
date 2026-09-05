import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, reports } from "@/lib/db/schema";
import { requireUser } from "@/lib/user";
import { rateLimit } from "@/lib/ratelimit";
import { ok, fail, tooMany, readJson, isUuid, mapRouteError } from "@/lib/api";

const AUTO_HIDE_THRESHOLD = 3;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    if (!isUuid(id)) return fail("NOT_FOUND", "Creation not found.", 404);
    const limit = await rateLimit("report", user.id);
    if (!limit.allowed) return tooMany(limit.retryAfterSec, "Too many reports.");
    const body = await readJson<{ reason?: string }>(req);
    const reason = (body.reason ?? "").slice(0, 500);

    const target = (
      await db.select().from(creations).where(eq(creations.id, id)).limit(1)
    )[0];
    if (!target) return fail("NOT_FOUND", "Creation not found.", 404);

    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(reports)
        .values({ targetType: "creation", targetId: id, userId: user.id, reason })
        .onConflictDoNothing()
        .returning();
      if (inserted.length === 0) return;
      const updated = (
        await tx
          .update(creations)
          .set({ reportCount: sql`${creations.reportCount} + 1` })
          .where(eq(creations.id, id))
          .returning()
      )[0];
      if (updated.reportCount >= AUTO_HIDE_THRESHOLD) {
        await tx.update(creations).set({ isHidden: true }).where(eq(creations.id, id));
      }
    });

    return ok({ reported: true });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
