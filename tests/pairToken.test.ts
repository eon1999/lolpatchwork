import { describe, expect, it } from "vitest";
import { issuePairToken, parsePairToken, verifyPairToken } from "@/lib/pairToken";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const WEEK = "2026-W36";
const VOTER = "33333333-3333-3333-3333-333333333333";

describe("pairToken", () => {
  it("round-trips", () => {
    const token = issuePairToken({ a: A, b: B, week: WEEK, voter: VOTER });
    const parsed = parsePairToken(token);
    expect(parsed).toEqual({ a: A, b: B, week: WEEK, voter: VOTER });
  });

  it("verify matches the signed values", () => {
    const token = issuePairToken({ a: A, b: B, week: WEEK, voter: VOTER });
    expect(verifyPairToken(token, A, B, WEEK, VOTER)).toBe(true);
    expect(verifyPairToken(token, B, A, WEEK, VOTER)).toBe(false);
    expect(verifyPairToken(token, A, B, "2026-W35", VOTER)).toBe(false);
    expect(verifyPairToken(token, A, B, WEEK, "44444444-4444-4444-4444-444444444444")).toBe(false);
  });

  it("rejects tampered payloads", () => {
    const token = issuePairToken({ a: A, b: B, week: WEEK, voter: VOTER });
    const [body, sig] = token.split(".");
    const tampered = Buffer.from(
      JSON.stringify({ a: B, b: A, week: WEEK, voter: VOTER }),
    ).toString("base64url");
    expect(parsePairToken(`${tampered}.${sig}`)).toBeNull();
    expect(parsePairToken(`${body}.notthesig`)).toBeNull();
    expect(parsePairToken("garbage")).toBeNull();
  });
});
