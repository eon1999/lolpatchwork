"use client";

import Link from "next/link";
import { ChampionCardFull } from "@/components/ChampionCard";
import type { CreationCard } from "@/lib/creations";

export type ReleasedCardProps = {
  card: CreationCard;
  shareCopied: boolean;
  onShare: () => void;
};

const LINKS = [
  { href: "/gallery", label: "gallery" },
  { href: "/battle", label: "battle" },
];

export default function ReleasedCard({ card, shareCopied, onShare }: ReleasedCardProps) {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="mb-4 text-center font-display text-3xl tracking-wide text-gold">
        RELEASED INTO THE WILD
      </h1>
      <ChampionCardFull card={card} />
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onShare}
          className="rounded-lg border border-gold bg-gold/15 px-5 py-2.5 text-sm text-gold hover:bg-gold hover:text-abyss"
        >
          {shareCopied ? "link copied" : "share"}
        </button>
        <Link
          href={`/c/${card.id}`}
          className="rounded-lg border border-edge px-5 py-2.5 text-sm text-muted hover:border-gold/60 hover:text-gold"
        >
          permalink
        </Link>
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-edge px-5 py-2.5 text-sm text-muted hover:border-gold/60 hover:text-gold"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
