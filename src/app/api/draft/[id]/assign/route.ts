import { requireUser } from "@/lib/user";
import { assignSlot } from "@/lib/draft";
import { ok, fail, ApiError } from "@/lib/api";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { slot?: string };
    if (!body.slot) return fail("BAD_REQUEST", "Missing slot.", 400);
    const assignments = await assignSlot(id, user.id, body.slot);
    return ok({ assignments });
  } catch (err) {
    if (err instanceof Error && err.message === "BANNED") {
      return fail("BANNED", "Nope.", 403);
    }
    if (err instanceof ApiError) return fail(err.code, err.message, err.status);
    throw err;
  }
}
