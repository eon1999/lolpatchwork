"use client";

import Image from "next/image";
import Link from "next/link";
import { forwardRef } from "react";
import BattleAbilityRow from "@/components/battle/BattleAbilityRow";
import type { SlotKey } from "@/lib/champions";
import type { CreationCard } from "@/lib/creations";

const SLOTS: { key: Exclude<SlotKey, "model">; label: string }[] = [
  { key: "passive", label: "P" },
  { key: "q", label: "Q" },
  { key: "w", label: "W" },
  { key: "e", label: "E" },
  { key: "r", label: "R" },
];

const SIDE_STYLE = {
  a: {
    frame: "border-teal/45",
    badge: "border-teal/70 text-teal",
    header: "border-teal/30 bg-teal/5",
  },
  b: {
    frame: "border-blood/45",
    badge: "border-blood/70 text-red-300",
    header: "border-blood/30 bg-blood/5",
  },
} as const;

export type BattleCardProps = {
  card: CreationCard;
  side: "a" | "b";
};

/**
 * Trading-card layout for the arena: name, creator, splash art, then the five
 * abilities banded top to bottom so the two builds can be read against each other.
 */
const BattleCard = forwardRef<HTMLDivElement, BattleCardProps>(function BattleCard(
  { card, side },
  ref,
) {
  const style = SIDE_STYLE[side];
  const splash = card.model.splash || card.model.loading;

  return (
    <div
      ref={ref}
      data-side={side}
      className={`battle-card rounded-xl border-2 bg-panel p-2 shadow-2xl shadow-black/50 ${style.frame}`}
    >
      <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${style.header}`}>
        <span
          className={`shrink-0 rounded-full border bg-abyss/70 px-2 py-0.5 font-display text-sm leading-none tracking-wide ${style.badge}`}
        >
          {side.toUpperCase()}
        </span>
        <Link
          href={`/c/${card.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate font-display text-xl leading-tight tracking-wide text-gold-bright transition-colors hover:text-gold"
          title={card.name}
        >
          {card.name}
        </Link>
        <span className="shrink-0 text-[11px] text-muted">▲ {card.upvotes}</span>
      </div>

      <div className="mt-1.5 rounded-lg border border-edge/60 bg-deep/70 px-2.5 py-1">
        <span className="text-[11px] uppercase tracking-widest text-muted">by </span>
        <span className="text-xs text-gold/90">{card.authorName}</span>
        {card.tagline && (
          <span className="ml-2 truncate text-[11px] italic text-muted/80">{card.tagline}</span>
        )}
      </div>

      <div className="relative mt-1.5 aspect-[16/9] overflow-hidden rounded-lg border border-gold/30">
        <Image
          src={splash}
          alt={card.model.championName}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 40vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-abyss/90 to-transparent px-2.5 pb-1 pt-6 text-[10px] uppercase tracking-widest text-gold/80">
          {card.model.championName}
        </div>
      </div>

      <div className="mt-1.5 space-y-1">
        {SLOTS.map(({ key, label }, index) => {
          const slot = card.slots[key];
          if (!slot) return null;
          return (
            <BattleAbilityRow
              key={key}
              slot={key}
              label={label}
              data={slot}
              index={index}
              side={side}
            />
          );
        })}
      </div>
    </div>
  );
});

export default BattleCard;
