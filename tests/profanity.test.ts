import { describe, expect, it } from "vitest";
import { isCleanText, normalizeForFilter } from "@/lib/profanity";

describe("profanity filter", () => {
  it("lets champion-like names through", () => {
    for (const ok of ["Kai'Sa", "Kha'Zix", "Cho'Gath", "LeBlanc", "Dr. Mundo", "Nunu & Willump", "Renata Glasc", "Bel'Veth", "Lee Sin", "The Unkillable Accident"]) {
      expect(isCleanText(ok)).toBe(true);
    }
  });

  it("catches plain profanity", () => {
    expect(isCleanText("fuuck")).toBe(false);
    expect(isCleanText("this is shit")).toBe(false);
  });

  it("catches leetspeak", () => {
    expect(isCleanText("sh1t")).toBe(false);
    expect(isCleanText("b1tch")).toBe(false);
  });

  it("catches spaced-out and repeated-letter evasions", () => {
    expect(isCleanText("f u c k")).toBe(false);
    expect(isCleanText("fuuuuuck")).toBe(false);
  });

  it("catches homoglyphs after normalization", () => {
    expect(isCleanText("fuсk")).toBe(false); // Cyrillic с
  });

  it("empty taglines are fine", () => {
    expect(isCleanText("")).toBe(true);
  });

  it("catches repeat + spacing evasions combined", () => {
    expect(isCleanText("FUU UUCK")).toBe(false);
    expect(isCleanText("f uu c k")).toBe(false);
  });
});
