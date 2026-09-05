import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, drafts, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/user";
import { loadDraftForPublish } from "@/lib/draft";
import { PATCH } from "@/lib/champions";
import { currentWeekKey } from "@/lib/weeks";
import { isCleanText, GENERIC_REJECT_MESSAGE } from "@/lib/profanity";
import { rateLimit } from "@/lib/ratelimit";
import { ok, fail, ApiError } from "@/lib/api";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const limit = await rateLimit("publish", user.id);
    if (!limit.allowed) return fail("RATE_LIMITED", "Too many publishes. Cool off a bit.", 429);

    // Only name/tagline are read. Any client-sent champion ids are structurally
    // ignored (AC §2.5) — the row is built from the server-held draft.
    const body = (await req.json().catch(() => ({}))) as { name?: string; tagline?: string };
    const name = (body.name ?? "").trim();
    const tagline = (body.tagline ?? "").trim();

    if (name.length < 1 || name.length > 24) {
      return fail("BAD_NAME", "Name must be 1-24 characters.", 400);
    }
    if (tagline.length > 140) {
      return fail("BAD_TAGLINE", "Tagline must be ≤140 characters.", 400);
    }
    if (!isCleanText(name) || !isCleanText(tagline)) {
      return fail("REJECTED_TEXT", GENERIC_REJECT_MESSAGE, 400);
    }

    const draft = await loadDraftForPublish(id, user.id);
    const a = draft.assignments;

    const inserted = await db.transaction(async (tx) => {
      const row = (
        await tx
          .insert(creations)
          .values({
            draftId: draft.id,
            userId: user.id,
            name,
            tagline: tagline || null,
            modelId: a.model!,
            passiveId: a.passive!,
            qId: a.q!,
            wId: a.w!,
            eId: a.e!,
            rId: a.r!,
            patch: PATCH,
            weekKey: currentWeekKey(),
          })
          .returning()
      )[0];
      await tx.update(drafts).set({ status: "published" }).where(eq(drafts.id, draft.id));
      return row;
    });

    const author = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0];
    return ok({ creationId: inserted.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "BANNED") {
      return fail("BANNED", "Nope.", 403);
    }
    if (err instanceof ApiError) return fail(err.code, err.message, err.status);
    throw err;
  }
}
