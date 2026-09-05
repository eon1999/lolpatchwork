import { describe, expect, it } from "vitest";
import { weekKeyOf, currentWeekKey, closingWeekKey, weekKeyToDate } from "@/lib/weeks";

describe("weeks", () => {
  it("Dec 29 2025 is ISO week 2026-W01 (year boundary)", () => {
    expect(weekKeyOf(new Date("2025-12-29T00:00:00Z"))).toBe("2026-W01");
    expect(weekKeyOf(new Date("2025-01-01T00:00:00Z"))).toBe("2025-W01");
  });

  it("pads week numbers", () => {
    expect(weekKeyOf(new Date("2026-01-05T00:00:00Z"))).toBe("2026-W02");
  });

  it("Sunday 23:58 vs Monday 00:02 straddle the rollover (AC §1.6)", () => {
    expect(weekKeyOf(new Date("2026-08-30T23:58:00Z"))).toBe("2026-W35");
    expect(weekKeyOf(new Date("2026-08-31T00:02:00Z"))).toBe("2026-W36");
  });

  it("always computes from UTC regardless of the process timezone", () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(weekKeyOf(new Date("2026-08-31T00:02:00Z"))).toBe("2026-W36");
      expect(weekKeyOf(new Date("2026-08-30T23:58:00Z"))).toBe("2026-W35");
    } finally {
      process.env.TZ = originalTz;
    }
  });

  it("weekKeyToDate roundtrips to Monday 00:00 UTC", () => {
    expect(weekKeyToDate("2026-W36").toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(weekKeyToDate("2026-W01").toISOString()).toBe("2025-12-29T00:00:00.000Z");
  });

  it("closingWeekKey looks back one hour", () => {
    expect(closingWeekKey(new Date("2026-09-07T00:30:00Z"))).toBe("2026-W36");
    expect(closingWeekKey(new Date("2026-08-31T00:30:00Z"))).toBe("2026-W35");
  });

  it("currentWeekKey is well-formed", () => {
    expect(currentWeekKey()).toMatch(/^\d{4}-W\d{2}$/);
  });
});
