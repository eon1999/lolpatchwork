import { requireUser } from "@/lib/user";
import { assignSlot } from "@/lib/draft";
import { ok, fail, readJson, mapRouteError } from "@/lib/api";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson<{ slot?: string }>(req);
    if (!body.slot) return fail("BAD_REQUEST", "Missing slot.", 400);
    const assignments = await assignSlot(id, user.id, body.slot);
    return ok({ assignments });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
