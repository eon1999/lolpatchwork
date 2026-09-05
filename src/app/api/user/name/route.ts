import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/user";
import { isCleanText, GENERIC_REJECT_MESSAGE } from "@/lib/profanity";
import { ok, fail } from "@/lib/api";

const RENAME_COOLDOWN_MS = 24 * 3600 * 1000;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const name = (body.name ?? "").trim();
    if (name.length < 1 || name.length > 24) {
      return fail("BAD_NAME", "Name must be 1-24 characters.", 400);
    }
    if (!isCleanText(name)) return fail("REJECTED_TEXT", GENERIC_REJECT_MESSAGE, 400);

    const current = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0];
    if (
      current.renamedAt &&
      Date.now() - current.renamedAt.getTime() < RENAME_COOLDOWN_MS &&
      current.displayName !== name
    ) {
      const hours = Math.ceil((RENAME_COOLDOWN_MS - (Date.now() - current.renamedAt.getTime())) / 3600000);
      return fail("TOO_SOON", `You can rename again in ${hours}h.`, 429);
    }

    await db
      .update(users)
      .set({ displayName: name, renamedAt: new Date() })
      .where(eq(users.id, user.id));
    return ok({ name });
  } catch (err) {
    if (err instanceof Error && err.message === "BANNED") {
      return fail("BANNED", "Nope.", 403);
    }
    throw err;
  }
}
