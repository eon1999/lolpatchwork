import { randomInt } from "node:crypto";

/**
 * Anonymous handles: three League-flavoured words plus two digits.
 * Every word is kept to six characters so the worst case
 * ("Grumpy Turret Ganker 07") still fits the 24-char rename limit.
 */
const FIRST = [
  "Feral", "Sleepy", "Grumpy", "Silent", "Lunar", "Gilded", "Salty", "Cursed",
  "Void", "Hexed", "Rune", "Iron", "Ashen", "Wild", "Smug", "Tilted",
] as const;

const SECOND = [
  "Poro", "Krug", "Wraith", "Gromp", "Yordle", "Minion", "Drake", "Baron",
  "Rift", "Nexus", "Turret", "Wolf", "Raptor", "Blitz", "Herald", "Kraken",
] as const;

const THIRD = [
  "Main", "Diver", "Feeder", "Carry", "Inter", "Warden", "Roamer", "Ganker",
  "Mid", "Smurf", "Tilter", "Jungle", "Duo", "Bot", "Top", "Sup",
] as const;

export const DISPLAY_NAME_MAX = 24;

function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}

/** Uses crypto randomness, not Math.random, so handles don't cluster. */
export function randomDisplayName(): string {
  const digits = String(randomInt(100)).padStart(2, "0");
  return `${pick(FIRST)} ${pick(SECOND)} ${pick(THIRD)} ${digits}`;
}
