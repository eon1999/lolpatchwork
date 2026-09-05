import type { Creation } from "@/lib/db/schema";
import { getChampion, ABILITY_SLOTS, type SlotKey } from "@/lib/champions";

export type SlotDTO = {
  championId: string;
  championName: string;
  championSquare: string;
  abilityName: string;
  icon: string;
  description: string;
  cooldown?: string;
  cost?: string;
  range?: string;
};

export type CreationCard = {
  id: string;
  name: string;
  tagline: string | null;
  patch: string;
  weekKey: string;
  rating: number;
  upvotes: number;
  battles: number;
  wins: number;
  createdAt: string;
  authorName: string;
  model: {
    championId: string;
    championName: string;
    championTitle: string;
    loading: string;
    square: string;
    splash: string;
  };
  slots: Record<(typeof ABILITY_SLOTS)[number], SlotDTO>;
};

const SLOT_COLUMNS: Record<(typeof ABILITY_SLOTS)[number], keyof Creation> = {
  passive: "passiveId",
  q: "qId",
  w: "wId",
  e: "eId",
  r: "rId",
};

export function toCard(creation: Creation, authorName: string): CreationCard {
  const model = getChampion(creation.modelId);
  const slots = {} as Record<(typeof ABILITY_SLOTS)[number], SlotDTO>;
  for (const slot of ABILITY_SLOTS) {
    const champ = getChampion(creation[SLOT_COLUMNS[slot]] as string);
    if (!champ) continue;
    const ability = champ.abilities[slot];
    slots[slot] = {
      championId: champ.id,
      championName: champ.name,
      championSquare: champ.square,
      abilityName: ability.name,
      icon: ability.icon,
      description: ability.description,
      cooldown: ability.cooldown,
      cost: ability.cost,
      range: ability.range,
    };
  }
  return {
    id: creation.id,
    name: creation.name,
    tagline: creation.tagline,
    patch: creation.patch,
    weekKey: creation.weekKey,
    rating: creation.rating,
    upvotes: creation.upvotes,
    battles: creation.battles,
    wins: creation.wins,
    createdAt: creation.createdAt.toISOString(),
    authorName,
    model: {
      championId: model?.id ?? creation.modelId,
      championName: model?.name ?? creation.modelId,
      championTitle: model?.title ?? "",
      loading: model?.loading ?? "",
      square: model?.square ?? "",
      splash: model?.splash ?? "",
    },
    slots,
  };
}
