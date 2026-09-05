import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  return process.env.PAIR_TOKEN_SECRET ?? "dev-pair-token-secret";
}

export type PairPayload = { a: string; b: string; week: string; voter: string };

function mac(payload: PairPayload): string {
  return createHmac("sha256", secret())
    .update(`${payload.a}:${payload.b}:${payload.week}:${payload.voter}`)
    .digest("base64url");
}

/** The vote endpoint cannot be fed an arbitrary pair (SPEC §2.6). */
export function issuePairToken(payload: PairPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(payload)}`;
}

export function parsePairToken(token: string): PairPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(token.slice(0, dot), "base64url").toString("utf8"),
    ) as PairPayload;
    if (!payload.a || !payload.b || !payload.week || !payload.voter) return null;
    const expected = Buffer.from(mac(payload));
    const actual = Buffer.from(token.slice(dot + 1));
    if (expected.length !== actual.length) return null;
    return timingSafeEqual(expected, actual) ? payload : null;
  } catch {
    return null;
  }
}

export function verifyPairToken(
  token: string,
  aId: string,
  bId: string,
  weekKey: string,
  voterId: string,
): boolean {
  const payload = parsePairToken(token);
  return (
    payload !== null &&
    payload.a === aId &&
    payload.b === bId &&
    payload.week === weekKey &&
    payload.voter === voterId
  );
}
