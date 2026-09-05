import { describe, expect, it } from "vitest";
import { expectedScore, updateRatings } from "@/lib/elo";

describe("elo", () => {
  it("equal ratings expect 0.5", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 10);
  });

  it("higher rating expects more", () => {
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });

  it("winner gains, loser loses, conserving total points (K=24)", () => {
    const [a, b] = updateRatings(1200, 1200, "a");
    expect(a).toBe(1212);
    expect(b).toBe(1188);
    expect(a + b).toBe(2400);
  });

  it("upset moves more points than expected result", () => {
    const [aAfterExpected] = updateRatings(1400, 1200, "a");
    const [aAfterUpset] = updateRatings(1400, 1200, "b");
    expect(1400 - aAfterUpset).toBeGreaterThan(aAfterExpected - 1400);
  });

  it("points sum is conserved for asymmetric matchups too", () => {
    const [a, b] = updateRatings(1350, 1105, "b");
    expect(a + b).toBe(2455);
  });
});
