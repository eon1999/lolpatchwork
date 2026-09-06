import Image from "next/image";
import Link from "next/link";
import type { CreationCard as CreationCardDTO } from "@/lib/creations";

const SLOT_ORDER: (keyof CreationCardDTO["slots"])[] = ["passive", "q", "w", "e", "r"];

/**
 * An inventory row: one of the viewer's own creations with the stats they care
 * about — upvotes, lifetime record and elo — at a glance.
 */
export default function MyCreationCard({ card }: { card: CreationCardDTO }) {
  const record =
    card.battles > 0
      ? `${card.wins}W-${card.battles - card.wins}L · ${Math.round((card.wins / card.battles) * 100)}%`
      : "untested";

  return (
    <Link
      href={`/c/${card.id}`}
      className="group block overflow-hidden rounded-xl border border-edge/70 bg-panel transition-colors hover:border-gold/60"
    >
      <div className="flex items-stretch">
        <div className="relative w-24 shrink-0">
          <Image
            src={card.model.loading}
            alt={card.model.championName}
            fill
            unoptimized
            sizes="96px"
            className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-display text-lg leading-tight tracking-wide text-gold-bright group-hover:text-gold">
              {card.name}
            </span>
            <span className="shrink-0 text-[10px] text-muted">▲ {card.upvotes}</span>
          </div>
          <div className="truncate text-xs text-muted">
            {card.model.championName}&apos;s body · patch {card.patch}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Stat>{record}</Stat>
            <Stat>elo {card.rating}</Stat>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            {SLOT_ORDER.map((key) => {
              const slot = card.slots[key];
              if (!slot) return null;
              return (
                <span
                  key={key}
                  className="relative h-8 w-8 shrink-0"
                  title={`${slot.abilityName} (${slot.championName})`}
                >
                  <Image
                    src={slot.icon}
                    alt={slot.abilityName}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded border border-edge/80 object-cover"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 overflow-hidden rounded-full border border-abyss">
                    <Image
                      src={slot.championSquare}
                      alt=""
                      width={12}
                      height={12}
                      className="h-3 w-3 object-cover"
                    />
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </Link>
  );
}

function Stat({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-edge/70 bg-panel-raised px-1.5 py-0.5 text-[10px] text-muted">
      {children}
    </span>
  );
}
