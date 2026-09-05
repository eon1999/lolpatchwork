import { requireUser } from "@/lib/user";
import { startDraft } from "@/lib/draft";
import { rateLimit } from "@/lib/ratelimit";
import { ok, fail, tooMany, mapRouteError } from "@/lib/api";

export async function POST() {
  try {
    const user = await requireUser();
    if (user.isBanned) return fail("BANNED", "Nope.", 403);
    const limit = await rateLimit("draft", user.id);
    if (!limit.allowed) return tooMany(limit.retryAfterSec, "Too many drafts. Cool off a bit.");
    const draftId = await startDraft(user.id);
    return ok({ draftId, total: 6 });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
