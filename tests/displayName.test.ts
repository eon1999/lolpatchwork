import { describe, expect, it } from "vitest";
import { DISPLAY_NAME_MAX, randomDisplayName } from "../src/lib/displayName";

describe("randomDisplayName", () => {
  it("is three words plus two digits", () => {
    for (let i = 0; i < 50; i++) {
      expect(randomDisplayName()).toMatch(/^[A-Za-z]+ [A-Za-z]+ [A-Za-z]+ \d{2}$/);
    }
  });

  it("always fits the rename limit, so a user can retype their own handle", () => {
    for (let i = 0; i < 500; i++) {
      expect(randomDisplayName().length).toBeLessThanOrEqual(DISPLAY_NAME_MAX);
    }
  });

  it("actually varies — 200 draws produce lots of distinct handles", () => {
    const seen = new Set(Array.from({ length: 200 }, randomDisplayName));
    expect(seen.size).toBeGreaterThan(150);
  });

  it("uses the full 00-99 digit range, including leading zeroes", () => {
    const suffixes = new Set(
      Array.from({ length: 800 }, () => randomDisplayName().slice(-2)),
    );
    expect(suffixes.size).toBeGreaterThan(80);
    expect([...suffixes].every((s) => /^\d{2}$/.test(s))).toBe(true);
  });
});
