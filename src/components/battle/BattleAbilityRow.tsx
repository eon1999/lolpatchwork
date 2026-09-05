"use client";

import Image from "next/image";
import { useState } from "react";
import AbilityPopup from "@/components/draft/AbilityPopup";
import type { Ability, SlotKey } from "@/lib/champions";
import type { SlotDTO } from "@/lib/creations";

export type BattleAbilityRowProps = {
  slot: Exclude<SlotKey, "model">;
  label: string;
  data: SlotDTO;
  /** Row index — the alternating band the row is painted with. */
  index: number;
  /** Which side of the arena the card sits on, so the popup opens outwards. */
  side: "a" | "b";
};

const BANDS = [
  "border-edge/70 bg-panel-raised/70",
  "border-gold/25 bg-deep/80",
] as const;

const CHIPS = [
  "border-gold/50 bg-gold/15 text-gold",
  "border-teal/40 bg-teal/10 text-teal",
] as const;

/**
 * One line of the card's ability stack. Hovering it opens the same explainer the
 * draft uses, anchored beside the row instead of above the dock.
 */
export default function BattleAbilityRow({
  slot,
  label,
  data,
  index,
  side,
}: BattleAbilityRowProps) {
  const [open, setOpen] = useState(false);
  const band = BANDS[index % BANDS.length];
  const chip = CHIPS[index % CHIPS.length];
  const ability: Ability = {
    name: data.abilityName,
    description: data.description,
    icon: data.icon,
    cooldown: data.cooldown,
    cost: data.cost,
    range: data.range,
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-label={`${label}: ${data.abilityName} from ${data.championName}`}
        className={`flex w-full items-center gap-2.5 rounded-md border px-2 py-1.5 text-left transition-colors ${band} ${
          open ? "border-gold/70 bg-gold/10" : ""
        }`}
      >
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-display text-[11px] leading-none tracking-widest ${chip}`}
        >
          {label}
        </span>
        <span className="relative h-9 w-9 shrink-0">
          <Image
            src={data.icon}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 rounded border border-edge/80 object-cover"
          />
          <span className="absolute -bottom-1 -right-1 h-4 w-4 overflow-hidden rounded-full border border-abyss bg-abyss">
            <Image
              src={data.championSquare}
              alt=""
              width={16}
              height={16}
              unoptimized
              className="h-4 w-4 object-cover"
            />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gold-bright">
            {data.abilityName}
          </span>
          <span className="block truncate text-[11px] text-muted">
            {data.championName}
            {data.cooldown ? ` · cd ${data.cooldown}` : ""}
          </span>
        </span>
      </button>

      {open && (
        <div
          className={`absolute z-40 max-md:left-1/2 max-md:top-full max-md:mt-2 max-md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 ${
            side === "a" ? "md:left-full md:ml-3" : "md:right-full md:mr-3"
          }`}
        >
          <AbilityPopup
            championId={data.championId}
            championName={data.championName}
            slot={slot}
            ability={ability}
            onClose={() => setOpen(false)}
            origin={side === "a" ? "center left" : "center right"}
          />
        </div>
      )}
    </div>
  );
}
