import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

/** A hash of a password nobody has, used to keep failed logins as slow as successful ones. */
const DECOY_HASH =
  "scrypt$0000000000000000000000000000000000000000000000000000000000000000";

export type Validated = { ok: true; value: string } | { ok: false; message: string };

/** Usernames are stored and compared lowercase so `Riven` and `riven` are one account. */
export function normalizeUsername(raw: unknown): Validated {
  if (typeof raw !== "string") return { ok: false, message: "Username is required." };
  const value = raw.trim().toLowerCase();
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    return { ok: false, message: `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters.` };
  }
  if (!USERNAME_PATTERN.test(value)) {
    return { ok: false, message: "Username can only use a-z, 0-9 and underscores." };
  }
  return { ok: true, value };
}

export function validatePassword(raw: unknown): Validated {
  if (typeof raw !== "string") return { ok: false, message: "Password is required." };
  if (raw.length < PASSWORD_MIN || raw.length > PASSWORD_MAX) {
    return { ok: false, message: `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters.` };
  }
  return { ok: true, value: raw };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const parts = (stored ?? DECOY_HASH).split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    // Still burn the time so a missing/garbage hash is indistinguishable from a wrong password.
    await scrypt(password, "decoy", KEY_LENGTH);
    return false;
  }
  const [, salt, keyHex] = parts;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, salt, KEY_LENGTH);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
