import raw from "@/data/champions.json";
import version from "@/data/version.json";

export type Ability = {
  name: string;
  description: string;
  icon: string;
  cooldown?: string;
  cost?: string;
  range?: string;
};

export type Champion = {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  square: string;
  loading: string;
  splash: string;
  abilities: {
    passive: Ability;
    q: Ability;
    w: Ability;
    e: Ability;
    r: Ability;
  };
};

export const CHAMPIONS = raw as Record<string, Champion>;
export const CHAMPION_IDS = Object.keys(CHAMPIONS).sort();
export const PATCH = version.patch;

export function getChampion(id: string): Champion | undefined {
  return CHAMPIONS[id];
}

export const SLOT_KEYS = ["model", "passive", "q", "w", "e", "r"] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export const ABILITY_SLOTS: Exclude<SlotKey, "model">[] = ["passive", "q", "w", "e", "r"];

export function abilityForSlot(champion: Champion, slot: Exclude<SlotKey, "model">): Ability {
  return champion.abilities[slot];
}

export function iconForSlot(champion: Champion, slot: SlotKey): string {
  return slot === "model" ? champion.loading : champion.abilities[slot].icon;
}
