import { requireUser } from "@/lib/user";
import { revealNext } from "@/lib/draft";
import { ok, fail, ApiError } from "@/lib/api";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { index, champion } = await revealNext(id, user.id);
    return ok({ index, champion });
  } catch (err) {
    if (err instanceof Error && err.message === "BANNED") {
      return fail("BANNED", "Nope.", 403);
    }
    if (err instanceof ApiError) return fail(err.code, err.message, err.status);
    throw err;
  }
}
