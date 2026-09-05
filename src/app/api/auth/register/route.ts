import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser, clientIpHash } from "@/lib/user";
import { hashPassword, normalizeUsername, validatePassword } from "@/lib/auth";
import { isCleanText, GENERIC_REJECT_MESSAGE } from "@/lib/profanity";
import { rateLimit } from "@/lib/ratelimit";
import { ok, fail } from "@/lib/api";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

/**
 * Claims the current anonymous session with a username + password so it can be
 * recovered from another device. Everything the session already made stays with it.
 */
export async function POST(req: Request) {
  try {
    const limited = await rateLimit("auth", await clientIpHash());
    if (!limited.allowed) return fail("RATE_LIMITED", "Too many attempts. Wait a bit.", 429);

    const body = (await req.json().catch(() => ({}))) as {
      username?: unknown;
      password?: unknown;
    };
    const username = normalizeUsername(body.username);
    if (!username.ok) return fail("BAD_USERNAME", username.message, 400);
    const password = validatePassword(body.password);
    if (!password.ok) return fail("BAD_PASSWORD", password.message, 400);
    if (!isCleanText(username.value)) return fail("REJECTED_TEXT", GENERIC_REJECT_MESSAGE, 400);

    const user = await requireUser();
    if (user.username) return fail("ALREADY_CLAIMED", "This session already has an account.", 409);

    const taken = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username.value))
      .limit(1);
    if (taken.length > 0) return fail("USERNAME_TAKEN", "That username is taken.", 409);

    const displayName = String(body.username).trim().slice(0, 24);
    try {
      const updated = await db
        .update(users)
        .set({
          username: username.value,
          passwordHash: await hashPassword(password.value),
          displayName,
        })
        .where(eq(users.id, user.id))
        .returning({ username: users.username, displayName: users.displayName });
      return ok({ username: updated[0].username, displayName: updated[0].displayName });
    } catch (err) {
      // Unique index lost the race with a concurrent signup for the same name.
      if (isUniqueViolation(err)) return fail("USERNAME_TAKEN", "That username is taken.", 409);
      throw err;
    }
  } catch (err) {
    if (err instanceof Error && err.message === "BANNED") return fail("BANNED", "Nope.", 403);
    throw err;
  }
}
