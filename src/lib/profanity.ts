/**
 * Text filter for the four UGC fields (creation name, tagline, comment, display
 * name). Normalizes leetspeak, spacing, repeated chars and common homoglyphs
 * before matching (SPEC §1.8).
 */

const LEETSPEAK: Record<string, string> = {
  "0": "o",
  "1": "i",
  "!": "i",
  "3": "e",
  "4": "a",
  "@": "a",
  "5": "s",
  $: "s",
  "7": "t",
  "+": "t",
  "8": "b",
  "9": "g",
  "6": "g",
};

const HOMOGLYPHS: Record<string, string> = {
  а: "a",
  е: "e",
  і: "i",
  о: "o",
  р: "p",
  с: "c",
  х: "x",
  у: "y",
};

const BANNED = [
  "fuck",
  "fck",
  "shit",
  "sh1t",
  "bitch",
  "b1tch",
  "bastard",
  "asshole",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "retard",
  "rape",
  "rapist",
  "pedophile",
  "paedophile",
  "pedo",
  "molest",
  "incest",
  "bestiality",
  "zoophilia",
  "nigg",
  "n1gg",
  "faggot",
  "f4gg0t",
  "f4g",
  "kike",
  "k1ke",
  "spic",
  "chink",
  "wetback",
  "gook",
  "tranny",
  "tr4nny",
  "dyke",
  "coon",
  "coonass",
  "redskin",
  "injun",
  "towelhead",
  "raghead",
  "jihadi",
  "isis",
  "heilhitler",
  "heil hitler",
  "swastika",
  "nazi",
  "hitler",
  "kkk",
  "whitepower",
  "white power",
  "kill yourself",
  "kys",
  "killyourself",
];

export function normalizeForFilter(input: string): string {
  let s = input.toLowerCase();
  s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[\u200b-\u200f\u2060\ufeff]/g, "");
  let out = "";
  for (const ch of s) {
    if (HOMOGLYPHS[ch]) out += HOMOGLYPHS[ch];
    else if (LEETSPEAK[ch]) out += LEETSPEAK[ch];
    else out += ch;
  }
  out = out.replace(/[^a-z0-9\s]/g, " ");
  out = out.replace(/(.)\1{1,}/g, "$1"); // collapse repeated chars: fuuuck → fuck
  out = out.replace(/\s+/g, " ");
  return out.trim();
}

export function isCleanText(input: string): boolean {
  const normalized = normalizeForFilter(input);
  const squashed = normalized.replace(/\s+/g, "");
  const collapsed = squashed.replace(/(.)\1{1,}/g, "$1");
  return !BANNED.some((term) => {
    const t = term.replace(/\s+/g, "");
    const tc = t.replace(/(.)\1{1,}/g, "$1");
    // Repeat-collapsed matching is only sound for terms that are themselves
    // stable under collapse ("kkk" would otherwise degrade to "k").
    const stable = t === tc;
    return normalized.includes(term) || squashed.includes(t) || (stable && collapsed.includes(tc));
  });
}

export const GENERIC_REJECT_MESSAGE = "Pick a different name.";
