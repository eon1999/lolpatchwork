import { describe, expect, it } from "vitest";
import {
  hashPassword,
  normalizeUsername,
  validatePassword,
  verifyPassword,
} from "../src/lib/auth";

describe("normalizeUsername", () => {
  it("lowercases and trims so casing can't fork an account", () => {
    expect(normalizeUsername("  Riven_Main  ")).toEqual({ ok: true, value: "riven_main" });
  });

  it("rejects names that are too short or too long", () => {
    expect(normalizeUsername("ab").ok).toBe(false);
    expect(normalizeUsername("a".repeat(21)).ok).toBe(false);
  });

  it("rejects characters outside a-z, 0-9 and underscore", () => {
    expect(normalizeUsername("riven main").ok).toBe(false);
    expect(normalizeUsername("riven-main").ok).toBe(false);
    expect(normalizeUsername("riven!").ok).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(normalizeUsername(undefined).ok).toBe(false);
    expect(normalizeUsername(42).ok).toBe(false);
  });
});

describe("validatePassword", () => {
  it("accepts an 8+ character password", () => {
    expect(validatePassword("hunter2!!")).toEqual({ ok: true, value: "hunter2!!" });
  });

  it("rejects short passwords and non-strings", () => {
    expect(validatePassword("short").ok).toBe(false);
    expect(validatePassword(null).ok).toBe(false);
  });

  it("rejects absurdly long passwords", () => {
    expect(validatePassword("a".repeat(201)).ok).toBe(false);
  });
});

describe("password hashing", () => {
  it("verifies the password it hashed", async () => {
    const stored = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse");
    expect(await verifyPassword("wrong horse", stored)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a).not.toEqual(b);
  });

  it("never stores the password in the clear", async () => {
    const stored = await hashPassword("plaintext-leak");
    expect(stored).not.toContain("plaintext-leak");
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("returns false for a missing or malformed hash", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
    expect(await verifyPassword("anything", "scrypt$onlytwo")).toBe(false);
  });
});
