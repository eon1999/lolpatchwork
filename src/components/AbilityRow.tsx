"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import AbilityPopup from "@/components/draft/AbilityPopup";
import type { Ability, SlotKey } from "@/lib/champions";

export type AbilityRowProps = {
  slot: Exclude<SlotKey, "model">;
  slotLabel: string;
  championId: string;
  abilityName: string;
  icon: string;
  championName: string;
  championSquare: string;
  description: string;
  cooldown?: string;
  cost?: string;
  range?: string;
};

/** One ability line on a creation card. Tapping it pops the explainer out
 *  beside the row (like the battle card) instead of stretching the card. */
export default function AbilityRow({
  slot,
  slotLabel,
  championId,
  abilityName,
  icon,
  championName,
  championSquare,
  description,
  cooldown,
  cost,
  range,
}: AbilityRowProps) {
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rowRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const ability: Ability = { name: abilityName, description, icon, cooldown, cost, range };

  return (
    <div ref={rowRef} className="relative border-t border-edge/50 py-2 first:border-t-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
        aria-expanded={open}
      >
        <span className="relative h-12 w-12 shrink-0">
          <Image
            src={icon}
            alt={`${championName} ${slotLabel}`}
            width={48}
            height={48}
            className="h-12 w-12 rounded-md border border-edge/80 object-cover"
          />
          <span className="absolute -bottom-1 -right-1 h-5 w-5 overflow-hidden rounded-full border border-gold/70 bg-abyss">
            <Image src={championSquare} alt="" width={20} height={20} className="h-5 w-5 object-cover" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="font-display text-sm tracking-wide text-gold">{slotLabel.toUpperCase()}</span>
            <span className="truncate text-sm font-semibold text-gold-bright">{abilityName}</span>
          </span>
          <span className="block truncate text-xs text-muted">
            from {championName}
            {cooldown ? ` · cd ${cooldown}` : ""}
          </span>
        </span>
        <span className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2">
          <AbilityPopup
            championId={championId}
            championName={championName}
            slot={slot}
            ability={ability}
            onClose={() => setOpen(false)}
            origin="top right"
          />
        </div>
      )}
    </div>
  );
}
