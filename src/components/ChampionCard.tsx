import Image from "next/image";
import Link from "next/link";
import AbilityRow from "@/components/AbilityRow";
import type { CreationCard as CreationCardDTO } from "@/lib/creations";

const SLOT_LABELS: { key: keyof CreationCardDTO["slots"]; label: string }[] = [
  { key: "passive", label: "Passive" },
  { key: "q", label: "Q" },
  { key: "w", label: "W" },
  { key: "e", label: "E" },
  { key: "r", label: "R" },
];

export function ChampionCardThumb({ card }: { card: CreationCardDTO }) {
  return (
    <Link
      href={`/c/${card.id}`}
      className="group block overflow-hidden rounded-lg border border-edge/70 bg-panel transition-colors hover:border-gold/60"
    >
      <div className="flex items-stretch">
        <div className="relative w-20 shrink-0 overflow-hidden">
          <Image
            src={card.model.loading}
            alt={card.model.championName}
            fill
            unoptimized
            sizes="80px"
            className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="min-w-0 flex-1 px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-display text-lg leading-tight tracking-wide text-gold-bright group-hover:text-gold">
              {card.name}
            </span>
            <span className="shrink-0 text-[10px] text-muted">▲ {card.upvotes}</span>
          </div>
          <div className="truncate text-xs text-muted">
            {card.model.championName}&apos;s body · by {card.authorName}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {SLOT_LABELS.map(({ key }) => {
              const slot = card.slots[key];
              if (!slot) return null;
              return (
                <span key={key} className="relative h-8 w-8 shrink-0" title={`${slot.abilityName} (${slot.championName})`}>
                  <Image
                    src={slot.icon}
                    alt={slot.abilityName}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded border border-edge/80 object-cover"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 overflow-hidden rounded-full border border-abyss">
                    <Image src={slot.championSquare} alt="" width={12} height={12} className="h-3 w-3 object-cover" />
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

export function ChampionCardFull({ card }: { card: CreationCardDTO }) {
  return (
    <article className="rounded-xl border border-edge/70 bg-panel shadow-2xl shadow-black/40">
      <div className="flex flex-col md:flex-row">
        <div className="relative w-full shrink-0 overflow-hidden rounded-t-xl md:w-72 md:rounded-l-xl md:rounded-tr-none">
          <div className="relative h-64 w-full md:h-full md:min-h-[480px]">
            <Image
              src={card.model.loading}
              alt={card.model.championName}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 288px"
              className="object-cover object-top"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-panel" />
          </div>
          <div className="absolute bottom-3 left-4 right-4 md:bottom-4">
            <div className="text-xs uppercase tracking-widest text-gold/90">{card.model.championName}&apos;s body</div>
            <div className="text-[11px] text-muted">{card.model.championTitle}</div>
          </div>
        </div>
        <div className="min-w-0 flex-1 p-4 md:p-6">
          <header className="mb-3">
            <h1 className="font-display text-3xl leading-none tracking-wide text-gold-bright md:text-4xl">
              {card.name}
            </h1>
            {card.tagline && <p className="mt-1 text-sm italic text-muted">{card.tagline}</p>}
            <p className="mt-2 text-xs text-muted">
              by {card.authorName} · patch {card.patch} · {card.battles} battles · {card.wins} W lifetime · elo{" "}
              {card.rating}
            </p>
          </header>
          <div>
            {SLOT_LABELS.map(({ key, label }) => {
              const slot = card.slots[key];
              if (!slot) return null;
              return (
                <AbilityRow
                  key={key}
                  slot={key}
                  slotLabel={label}
                  championId={slot.championId}
                  abilityName={slot.abilityName}
                  icon={slot.icon}
                  championName={slot.championName}
                  championSquare={slot.championSquare}
                  description={slot.description}
                  cooldown={slot.cooldown}
                  cost={slot.cost}
                  range={slot.range}
                />
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ChampionCard({
  card,
  size = "full",
}: {
  card: CreationCardDTO;
  size?: "thumb" | "full";
}) {
  return size === "thumb" ? <ChampionCardThumb card={card} /> : <ChampionCardFull card={card} />;
}
