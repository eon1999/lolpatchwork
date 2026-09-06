"use client";

import Image from "next/image";
import AbilityRow from "@/components/AbilityRow";
import { ABILITY_SLOTS, getChampion, type SlotKey } from "@/lib/champions";

const SLOT_LABELS: Record<(typeof ABILITY_SLOTS)[number], string> = {
  passive: "Passive",
  q: "Q",
  w: "W",
  e: "E",
  r: "R",
};

/** The champion being named, shown live on the publish screen: name and
 *  tagline update as they're typed, abilities come from the assignments. */
export default function CreationPreview({
  name,
  tagline,
  assignments,
}: {
  name: string;
  tagline: string;
  assignments: Partial<Record<SlotKey, string>>;
}) {
  const model = assignments.model ? getChampion(assignments.model) : undefined;
  if (!model) return null;

  const trimmedName = name.trim();
  const trimmedTagline = tagline.trim();

  return (
    <article className="rounded-xl border border-edge/70 bg-panel shadow-2xl shadow-black/40">
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full shrink-0 overflow-hidden rounded-t-xl sm:w-44 sm:rounded-l-xl sm:rounded-tr-none">
          <div className="relative h-44 w-full sm:h-full sm:min-h-[320px]">
            <Image
              src={model.loading}
              alt={model.name}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, 176px"
              className="object-cover object-top"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-panel" />
          </div>
          <div className="absolute bottom-2 left-3 right-3">
            <div className="text-[10px] uppercase tracking-widest text-gold/90">
              {model.name}&apos;s body
            </div>
            <div className="truncate text-[10px] text-muted">{model.title}</div>
          </div>
        </div>
        <div className="min-w-0 flex-1 p-4">
          <header className="mb-2">
            <h2
              className={`font-display text-2xl leading-none tracking-wide ${
                trimmedName ? "text-gold-bright" : "italic text-muted/60"
              }`}
            >
              {trimmedName || model.name}
            </h2>
            {trimmedTagline && <p className="mt-1 text-xs italic text-muted">{trimmedTagline}</p>}
          </header>
          <div>
            {ABILITY_SLOTS.map((slot) => {
              const champ = assignments[slot] ? getChampion(assignments[slot] as string) : undefined;
              if (!champ) return null;
              const ability = champ.abilities[slot];
              return (
                <AbilityRow
                  key={slot}
                  slot={slot}
                  slotLabel={SLOT_LABELS[slot]}
                  championId={champ.id}
                  abilityName={ability.name}
                  icon={ability.icon}
                  championName={champ.name}
                  championSquare={champ.square}
                  description={ability.description}
                  cooldown={ability.cooldown}
                  cost={ability.cost}
                  range={ability.range}
                />
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}
