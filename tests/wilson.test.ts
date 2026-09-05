import { describe, expect, it } from "vitest";
import { wilsonLowerBound } from "@/lib/wilson";

describe("wilson lower bound", () => {
  it("zero battles scores zero", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  it("1-0 does not top 40-31 (SPEC §1.6)", () => {
    expect(wilsonLowerBound(40, 71)).toBeGreaterThan(wilsonLowerBound(1, 1));
  });

  it("matches hand-computed values", () => {
    expect(wilsonLowerBound(1, 1)).toBeCloseTo(0.2065, 3);
    expect(wilsonLowerBound(40, 71)).toBeCloseTo(0.4477, 3);
    expect(wilsonLowerBound(10, 10)).toBeCloseTo(0.7224, 3);
  });

  it("monotonic in wins for fixed n", () => {
    expect(wilsonLowerBound(30, 50)).toBeGreaterThan(wilsonLowerBound(20, 50));
  });

  it("more data at the same rate scores higher", () => {
    expect(wilsonLowerBound(20, 40)).toBeGreaterThan(wilsonLowerBound(2, 4));
  });
});
