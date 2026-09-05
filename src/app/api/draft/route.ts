import { requireUser } from "@/lib/user";
import { startDraft } from "@/lib/draft";
import { rateLimit } from "@/lib/ratelimit";
import { ok, fail } from "@/lib/api";

export async function POST() {
  try {
    const user = await requireUser();
    if (user.isBanned) return fail("BANNED", "Nope.", 403);
    const limit = await rateLimit("draft", user.id);
    if (!limit.allowed) return fail("RATE_LIMITED", "Too many drafts. Cool off a bit.", 429);
    const draftId = await startDraft(user.id);
    return ok({ draftId, total: 6 });
  } catch (err) {
    if (err instanceof Error && err.message === "BANNED") {
      return fail("BANNED", "Nope.", 403);
    }
    throw err;
  }
}
