"use client";

import Image from "next/image";
import { forwardRef, useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import AbilityPopup from "@/components/draft/AbilityPopup";
import { ABILITY_SLOTS, type Champion, type SlotKey } from "@/lib/champions";

export type ChampionDockProps = {
  champion: Champion | null;
  /** Hidden while the roll is still flying towards the dock. */
  visible: boolean;
};

/**
 * The rolled champion, parked bottom-left once the reel lands: portrait, then the
 * abilities spanning left to right, passive through R. Any of them opens a popup.
 */
const ChampionDock = forwardRef<HTMLDivElement, ChampionDockProps>(function ChampionDock(
  { champion, visible },
  portraitRef,
) {
  const [openSlot, setOpenSlot] = useState<Exclude<SlotKey, "model"> | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // A new champion closes whatever was open and deals its abilities out.
  useEffect(() => {
    setOpenSlot(null);
    const strip = stripRef.current;
    if (!strip || !champion || !visible) return;
    animate(strip.querySelectorAll<HTMLElement>(".dock-ability"), {
      opacity: [0, 1],
      translateX: [-18, 0],
      scale: [0.85, 1],
      delay: stagger(60),
      duration: 380,
      ease: "out(3)",
    });
  }, [champion, visible]);

  useEffect(() => {
    if (!openSlot) return;
    function onPointerDown(event: MouseEvent) {
      if (!stripRef.current?.contains(event.target as Node)) setOpenSlot(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openSlot]);

  return (
    <div
      ref={stripRef}
      className={`fixed bottom-4 left-4 z-30 transition-opacity duration-200 ${
        visible && champion ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {champion && openSlot && (
        <div className="absolute bottom-full left-0 mb-3">
          <AbilityPopup
            championId={champion.id}
            championName={champion.name}
            slot={openSlot}
            ability={champion.abilities[openSlot]}
            onClose={() => setOpenSlot(null)}
          />
        </div>
      )}

      {/* Its own panel, so it never reads as text sitting on top of the footer. */}
      <div className="rounded-2xl border border-edge/70 bg-panel-raised/92 p-2.5 shadow-2xl shadow-black/70 backdrop-blur">
        <div className="mb-2 flex items-baseline gap-2 px-0.5">
          <span className="font-display text-base leading-none tracking-wide text-gold-bright">
            {champion?.name ?? ""}
          </span>
          <span className="max-w-[14rem] truncate text-[11px] italic text-muted">
            {champion?.title ?? ""}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div
            ref={portraitRef}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-gold/60 bg-deep"
          >
            {champion && (
              <Image
                src={champion.square}
                alt={champion.name}
                fill
                unoptimized
                sizes="56px"
                className="object-cover"
              />
            )}
          </div>

          {champion &&
            ABILITY_SLOTS.map((slot) => {
              const ability = champion.abilities[slot];
              const active = openSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setOpenSlot(active ? null : slot)}
                  aria-expanded={active}
                  title={`${ability.name} — what does this do?`}
                  className={`dock-ability group relative block h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:h-14 sm:w-14 ${
                    active
                      ? "border-gold bg-gold/20"
                      : "border-edge/70 hover:border-gold/70"
                  }`}
                >
                  <Image
                    src={ability.icon}
                    alt={ability.name}
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-abyss/80 text-center font-display text-[10px] tracking-widest text-gold">
                    {slot === "passive" ? "P" : slot.toUpperCase()}
                  </span>
                </button>
              );
            })}
          <span className="hidden max-w-[4.5rem] pl-1 text-[10px] leading-tight text-muted/70 sm:block">
            click an ability
          </span>
        </div>
      </div>
    </div>
  );
});

export default ChampionDock;
