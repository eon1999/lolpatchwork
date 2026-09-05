import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { clientIpHash, setUidCookie } from "@/lib/user";
import { normalizeUsername, validatePassword, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { ok, fail } from "@/lib/api";

const BAD_CREDENTIALS = "Wrong username or password.";

export async function POST(req: Request) {
  const limited = await rateLimit("auth", await clientIpHash());
  if (!limited.allowed) return fail("RATE_LIMITED", "Too many attempts. Wait a bit.", 429);

  const body = (await req.json().catch(() => ({}))) as { username?: unknown; password?: unknown };
  const username = normalizeUsername(body.username);
  const password = validatePassword(body.password);
  if (!username.ok || !password.ok) return fail("BAD_CREDENTIALS", BAD_CREDENTIALS, 401);

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username.value))
    .limit(1);
  const user = rows[0];

  // Runs the same work whether or not the user exists, so timing tells nothing.
  const matches = await verifyPassword(password.value, user?.passwordHash ?? null);
  if (!user || !matches) return fail("BAD_CREDENTIALS", BAD_CREDENTIALS, 401);
  if (user.isBanned) return fail("BANNED", "Nope.", 403);

  await setUidCookie(user.id);
  return ok({ username: user.username, displayName: user.displayName });
}
