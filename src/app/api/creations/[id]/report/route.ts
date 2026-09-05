import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, reports } from "@/lib/db/schema";
import { requireUser } from "@/lib/user";
import { ok, fail } from "@/lib/api";

const AUTO_HIDE_THRESHOLD = 3;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
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
    if (err instanceof Error && err.message === "BANNED") {
      return fail("BANNED", "Nope.", 403);
    }
    throw err;
  }
}
