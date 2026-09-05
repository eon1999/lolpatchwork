import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { battleComments, creations, users } from "@/lib/db/schema";
import { ok, fail } from "@/lib/api";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) return fail("FORBIDDEN", "Bad admin token.", 401);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    targetType?: "creation" | "comment";
    targetId?: string;
  };
  const { action, targetType, targetId } = body;
  if (!action || !targetId) return fail("BAD_REQUEST", "Missing action or targetId.", 400);

  switch (action) {
    case "hide":
    case "unhide": {
      const hide = action === "hide";
      if (targetType === "comment") {
        await db.update(battleComments).set({ isHidden: hide }).where(eq(battleComments.id, targetId));
      } else {
        // AC §1.8: hidden creation disappears from feed/pairing/leaderboard within one request.
        await db.update(creations).set({ isHidden: hide }).where(eq(creations.id, targetId));
      }
      return ok({ action, targetId });
    }
    case "ban":
    case "unban": {
      await db
        .update(users)
        .set({ isBanned: action === "ban" })
        .where(eq(users.id, targetId));
      return ok({ action, targetId });
    }
    default:
      return fail("BAD_ACTION", "Unknown action.", 400);
  }
}
