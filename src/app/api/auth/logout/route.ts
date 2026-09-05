import { clearUidCookie } from "@/lib/user";
import { ok } from "@/lib/api";

/** Drops the session cookie. The next request mints a fresh anonymous user. */
export async function POST() {
  await clearUidCookie();
  return ok({ signedOut: true });
}
