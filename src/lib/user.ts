import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { randomDisplayName } from "@/lib/displayName";
import { rateLimit } from "@/lib/ratelimit";

export const UID_COOKIE = "uid";
const YEAR_MS = 365 * 24 * 3600 * 1000;

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "dev-ip-salt";
  return createHash("sha256").update(ip + salt).digest("hex");
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "0.0.0.0";
}

/** Rate-limit identity for routes that run before a user exists (login, register). */
export async function clientIpHash(): Promise<string> {
  return hashIp(await clientIp());
}

export type SessionUser = {
  id: string;
  displayName: string;
  isBanned: boolean;
  username: string | null;
};

/** Read the current user without minting (for pages / GET routes). */
export async function getUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const uid = jar.get(UID_COOKIE)?.value;
  if (!uid) return null;
  const rows = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  const user = rows[0];
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.displayName,
    isBanned: user.isBanned,
    username: user.username,
  };
}

/**
 * Point the session cookie at a user id. Guest mints get a browser-session
 * cookie — their inventory only lasts the session unless they claim an
 * account, which re-sets the cookie as persistent.
 */
export async function setUidCookie(id: string, persistent = false): Promise<void> {
  const jar = await cookies();
  jar.set(UID_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(persistent ? { maxAge: Math.floor(YEAR_MS / 1000) } : {}),
    path: "/",
  });
}

export async function clearUidCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(UID_COOKIE);
}

/**
 * Read the uid cookie and mint an anonymous user if absent (SPEC §1.7).
 * Only callable from route handlers / server actions (sets the cookie).
 */
export async function requireUser(): Promise<SessionUser> {
  const existing = await getUser();
  if (existing) {
    if (existing.isBanned) throw new Error("BANNED");
    return existing;
  }
  // Cookie-less clients would otherwise mint a fresh user (and a fresh rate
  // limit identity) on every request — cap minting per IP first.
  const mint = await rateLimit("mint", await clientIpHash());
  if (!mint.allowed) throw new Error("RATE_LIMITED");
  const inserted = await db
    .insert(users)
    .values({
      displayName: randomDisplayName(),
      lastIpHash: hashIp(await clientIp()),
    })
    .returning();
  const user = inserted[0];
  await setUidCookie(user.id);
  return {
    id: user.id,
    displayName: user.displayName,
    isBanned: user.isBanned,
    username: user.username,
  };
}
