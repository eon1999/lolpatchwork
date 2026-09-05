"use client";

import Image from "next/image";
import type { SlotKey } from "@/lib/champions";
import { getChampion } from "@/lib/champions";

const SLOTS: { key: SlotKey; label: string; hint: string }[] = [
  { key: "model", label: "Body", hint: "whose skin you wear" },
  { key: "passive", label: "Passive", hint: "always on" },
  { key: "q", label: "Q", hint: "spam it" },
  { key: "w", label: "W", hint: "the pocket knife" },
  { key: "e", label: "E", hint: "the panic button" },
  { key: "r", label: "R", hint: "the big one" },
];

export default function SlotGrid({
  assignments,
  onPick,
  disabled,
  pending,
}: {
  assignments: Partial<Record<SlotKey, string>>;
  onPick: (slot: SlotKey) => void;
  disabled: boolean;
  pending?: SlotKey | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {SLOTS.map(({ key, label, hint }) => {
        const champId = assignments[key];
        const champ = champId ? getChampion(champId) : undefined;
        if (champ) {
          const icon =
            key === "model" ? champ.loading : champ.abilities[key].icon;
          return (
            <div
              key={key}
              className="relative overflow-hidden rounded-lg border border-edge/40 bg-panel/60 opacity-50"
            >
              <div className="flex items-center gap-2 p-2">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-edge/60">
                  <Image
                    src={icon}
                    alt={champ.name}
                    fill
                    unoptimized={key === "model"}
                    sizes="56px"
                    className="object-cover"
                  />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
                  <div className="truncate text-xs font-semibold text-gold-bright/70">
                    {key === "model" ? champ.name : champ.abilities[key].name}
                  </div>
                  {key !== "model" && (
                    <div className="truncate text-[10px] text-muted/70">from {champ.name}</div>
                  )}
                </div>
              </div>
              <div className="absolute right-1.5 top-1.5 text-[10px] text-muted/60">🔒</div>
            </div>
          );
        }
        return (
          <button
            key={key}
            disabled={disabled}
            onClick={() => onPick(key)}
            className={`group rounded-lg border border-dashed p-2 text-left transition-all ${
              pending === key
                ? "border-gold bg-gold/10"
                : disabled
                  ? "border-edge/40 opacity-40"
                  : "slot-glow border-gold/50 bg-panel hover:border-gold hover:bg-gold/10"
            }`}
          >
            <div className="flex h-14 items-center gap-2">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-edge/50 text-2xl text-muted/50 group-hover:text-gold">
                +
              </span>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
                <div className="text-[10px] text-muted/60">{hint}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
