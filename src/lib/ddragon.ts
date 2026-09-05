import { PATCH, type SlotKey } from "@/lib/champions";

const BASE = "https://ddragon.leagueoflegends.com";
const SPELL_INDEX: Record<Exclude<SlotKey, "model" | "passive">, number> = {
  q: 0,
  w: 1,
  e: 2,
  r: 3,
};

const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

const PLACEHOLDER = String.raw`\{\{\s*[^}]*\}\}`;

function re(pattern: string): RegExp {
  return new RegExp(pattern, "gi");
}

/**
 * Data Dragon leaves scaling values as `{{ e1 }}` placeholders we have no way to
 * resolve, and a tooltip full of "?" tells the reader nothing. So we drop the
 * numbers and repair the sentence around them — "deals {{ e1 }} magic damage"
 * becomes "deals magic damage", which is what the reader wanted to know anyway.
 *
 * Expects markup to be gone already: the grammar rules below match on words, and
 * a stray <scaleAP> tag between a preposition and its value would hide the pair.
 */
export function stripScalingNumbers(text: string): string {
  let out = text;
  // Scaling parentheticals — "(+{{ a1 }} of Max Health)" — go as a unit.
  out = out.replace(re(String.raw`\([^()]*${PLACEHOLDER}[^()]*\)`), "");
  // Riot writes "for up to {{ x }} seconds", so the hedge sits between the
  // preposition and its value and has to be matched along with it.
  const HEDGE = String.raw`(?:up\s+to\s+|at\s+least\s+|as\s+much\s+as\s+)?`;
  // Durations keep their preposition and lose only the figure, so "for X seconds",
  // "by X seconds" and "have X seconds" all still read.
  out = out.replace(
    re(String.raw`\bthe\s+(next|first|last)\s+${HEDGE}${PLACEHOLDER}\s*seconds?`),
    "the $1 few seconds",
  );
  out = out.replace(re(String.raw`${HEDGE}${PLACEHOLDER}\s*%?\s*seconds?(?:\(s\))?`), "a few seconds");
  // Countable repeats read better vague than missing.
  out = out.replace(
    re(String.raw`${HEDGE}${PLACEHOLDER}\s*(times|bounces|stacks|charges|hits)\b`),
    "several $1",
  );
  // Verbs whose only object was the number need one back, but only where the
  // number actually stood — "the damage he deals to Champions" is already fine.
  out = out.replace(
    re(String.raw`\b(deal|deals|dealing)\s+${PLACEHOLDER}\s+(?=(?:to|for)\b)`),
    "$1 damage ",
  );
  out = out.replace(re(String.raw`\b(takes?)\s+${PLACEHOLDER}\s+instead\b`), "$1 damage instead");
  // "{{ e1 }}% of their Health" reads fine as a proportion.
  out = out.replace(re(String.raw`${PLACEHOLDER}\s*%?\s+of\b`), "a portion of");
  out = out.replace(
    re(String.raw`${PLACEHOLDER}\s*%\s+(?=(?:missing|max|maximum|current|total|bonus)\b)`),
    "a portion of ",
  );
  out = out.replace(re(String.raw`\ba\s+total\s+of\s+${PLACEHOLDER}\s*%?\s*`), "");
  // "of" is the one preposition that usually binds to the noun after the value:
  // "a volley of {{ n }} arrows" wants "a volley of arrows", not "a volley arrows".
  // Clause-final ("to a maximum of {{ n }}.") still loses the "of" as well.
  out = out.replace(re(String.raw`\bof\s+${HEDGE}${PLACEHOLDER}\s*%?\s*(?=[.,;:)]|$)`), "");
  out = out.replace(re(String.raw`\bof\s+${HEDGE}${PLACEHOLDER}\s*%?\s+(?=[A-Za-z])`), "of ");
  // One rule for the general case: an optional preposition, an optional hedge,
  // then the value. Splitting these matched "up to" out of "by up to" (stranding
  // the "by") or "to" out of "up to" (stranding the "up"), so they go together.
  out = out.replace(
    re(String.raw`(?:\b(?:by|to|at|than|plus|for|over)\s+)?${HEDGE}${PLACEHOLDER}\s*%?`),
    "",
  );
  // Nested placeholders need more than one pass before the bare sweep.
  for (let i = 0; i < 3 && /\{\{/.test(out); i++) out = out.replace(re(PLACEHOLDER), "");
  return tidyProse(out.replace(/\{\{|\}\}/g, ""));
}

/** Repairs the gaps and dangling punctuation left behind by removing values. */
function tidyProse(text: string): string {
  return text
    .replace(/\(\s*[+\-/*]?\s*\)/g, "")
    .replace(/\s*\/\s*\/+/g, "")
    .replace(/\s+\/\s+/g, " ")
    .replace(/\(\s*\+\s*/g, "(")
    .replace(/(^|\s)\+\s*(?=\S)/gm, "$1")
    .replace(/\s*\+\s*(?=[).,;]|$)/gm, "")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([,.;:!?%])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();
}

/**
 * Flattens Data Dragon markup to plain text. It is never handed to innerHTML,
 * and any placeholder that survived stripScalingNumbers is dropped here.
 */
export function sanitizeTooltip(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/%i:[a-z0-9]+%/gi, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Markup out first — the grammar repair needs to see whole phrases. */
export function toReadableTooltip(raw: string): string {
  return stripScalingNumbers(sanitizeTooltip(raw));
}

export type AbilityDetail = {
  description: string;
  tooltip?: string;
  cooldown?: string;
  cost?: string;
  range?: string;
};

type DDragonSpell = {
  description?: string;
  tooltip?: string;
  cooldownBurn?: string;
  costBurn?: string;
  rangeBurn?: string;
};

type DDragonResponse = {
  data?: Record<
    string,
    { passive?: { description?: string }; spells?: DDragonSpell[] }
  >;
};

const cache = new Map<string, Promise<AbilityDetail | null>>();

async function loadChampion(championId: string): Promise<DDragonResponse | null> {
  const res = await fetch(`${BASE}/cdn/${PATCH}/data/en_US/champion/${championId}.json`);
  if (!res.ok) return null;
  return (await res.json()) as DDragonResponse;
}

/**
 * Pulls the live ability text straight from Riot's CDN for the ability popup.
 * Returns null on any failure so callers can fall back to the bundled copy.
 */
export function fetchAbilityDetail(
  championId: string,
  slot: Exclude<SlotKey, "model">,
): Promise<AbilityDetail | null> {
  const key = `${championId}:${slot}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const request = loadChampion(championId)
    .then((json): AbilityDetail | null => {
      const entry = json?.data?.[championId];
      if (!entry) return null;
      if (slot === "passive") {
        const description = entry.passive?.description;
        return description ? { description: toReadableTooltip(description) } : null;
      }
      const spell = entry.spells?.[SPELL_INDEX[slot]];
      if (!spell) return null;
      const tooltip = spell.tooltip ? toReadableTooltip(spell.tooltip) : undefined;
      return {
        description: toReadableTooltip(spell.description ?? ""),
        tooltip: tooltip && tooltip.length > 0 ? tooltip : undefined,
        cooldown: spell.cooldownBurn,
        cost: spell.costBurn,
        range: spell.rangeBurn,
      };
    })
    .catch(() => null);

  cache.set(key, request);
  return request;
}
