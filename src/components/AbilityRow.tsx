"use client";

import Image from "next/image";
import { useState } from "react";

export type AbilityRowProps = {
  slotLabel: string;
  abilityName: string;
  icon: string;
  championName: string;
  championSquare: string;
  description: string;
  cooldown?: string;
};

export default function AbilityRow({
  slotLabel,
  abilityName,
  icon,
  championName,
  championSquare,
  description,
  cooldown,
}: AbilityRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-edge/50 py-2 first:border-t-0">
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
        <p className="mt-2 ml-15 whitespace-pre-line border-l-2 border-gold/40 pl-3 text-xs leading-relaxed text-gold-bright/80">
          {description}
        </p>
      )}
    </div>
  );
}
