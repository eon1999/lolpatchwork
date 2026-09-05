/** Shown once, character by character, while the draft loads behind the curtain. */
export const FLAVOR_LINES = [
  "ready to int?",
  "LESS GOO!!!",
  "GET THIS BETA SHIT OFF ME!!!",
] as const;

export type FlavorLine = (typeof FLAVOR_LINES)[number];

export function randomFlavorLine(): FlavorLine {
  return FLAVOR_LINES[Math.floor(Math.random() * FLAVOR_LINES.length)];
}
