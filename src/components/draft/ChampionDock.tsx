"use client";

import Image from "next/image";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { animate, cubicBezier, stagger, utils } from "animejs";
import AbilityPopup from "@/components/draft/AbilityPopup";
import { ABILITY_SLOTS, CHAMPION_IDS, getChampion, type Champion, type SlotKey } from "@/lib/champions";

export type ChampionDockProps = {
  champion: Champion | null;
  /** Hidden while the roll is still flying towards the dock. */
  visible: boolean;
  /** Insta roll: the dock snaps in and the portrait does one fast slot spin. */
  pop?: boolean;
};

const PORTRAIT_PX = 56;
const SPIN_ITEMS = 6;
const SPIN_MS = 340;

function randomDecor() {
  const id = CHAMPION_IDS[Math.floor(Math.random() * CHAMPION_IDS.length)];
  return { src: getChampion(id)!.square, alt: id };
}

/**
 * The rolled champion, parked bottom-left once the reel lands: portrait, then the
 * abilities spanning left to right, passive through R. Any of them opens a popup.
 */
const ChampionDock = forwardRef<HTMLDivElement, ChampionDockProps>(function ChampionDock(
  { champion, visible, pop },
  portraitRef,
) {
  const [openSlot, setOpenSlot] = useState<Exclude<SlotKey, "model"> | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  // The mini slot strip for insta rolls: decor icons with the winner last.
  const spinStrip = useMemo(() => {
    if (!champion) return null;
    return [
      ...Array.from({ length: SPIN_ITEMS }, randomDecor),
      { src: champion.square, alt: champion.name },
    ];
  }, [champion]);

  // A new champion closes whatever was open and deals its abilities out.
  useEffect(() => {
    setOpenSlot(null);
    const strip = stripRef.current;
    if (!strip || !champion || !visible) return;
    animate(strip.querySelectorAll<HTMLElement>(".dock-ability"), {
      opacity: [0, 1],
      translateX: [-18, 0],
      scale: [0.85, 1],
      delay: stagger(pop ? 32 : 60),
      duration: pop ? 300 : 380,
      ease: "out(3)",
    });
  }, [champion, visible, pop]);

  // Insta entrance: the dock pops and the portrait runs one compressed
  // slot spin — same bezier, blur and overshoot as the big reel, ~0.5s total.
  useEffect(() => {
    if (!pop || !visible || !champion) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      if (spinRef.current) {
        utils.set(spinRef.current, { translateY: -(SPIN_ITEMS * PORTRAIT_PX) });
      }
      return;
    }

    if (panelRef.current) {
      animate(panelRef.current, {
        scale: [0.86, 1],
        translateX: [-26, 0],
        duration: 300,
        ease: "out(3)",
      });
    }

    const spin = spinRef.current;
    if (!spin) return;
    const finalPos = -(SPIN_ITEMS * PORTRAIT_PX);

    void (async () => {
      await animate(spin, {
        translateY: finalPos,
        filter: ["blur(0px)", "blur(2.5px)", "blur(0px)"],
        duration: SPIN_MS,
        ease: cubicBezier(0.16, 0.9, 0.28, 1),
      });
      await animate(spin, { translateY: finalPos - 4, duration: 60, ease: "out(2)" });
      await animate(spin, { translateY: finalPos, duration: 60, ease: "out(3)" });
      if (flashRef.current) {
        animate(flashRef.current, { opacity: [0.25, 0], duration: 140, ease: "out(2)" });
      }
    })();
  }, [champion, visible, pop]);

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
      <div
        ref={panelRef}
        className="rounded-2xl border border-edge/70 bg-panel-raised/92 p-2.5 shadow-2xl shadow-black/70 backdrop-blur"
      >
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
            {champion && pop && spinStrip ? (
              <div key={champion.id} ref={spinRef} className="flex flex-col will-change-transform">
                {spinStrip.map((item, i) => (
                  <span
                    key={i}
                    className="block shrink-0"
                    style={{ width: PORTRAIT_PX, height: PORTRAIT_PX }}
                  >
                    <Image
                      src={item.src}
                      alt={item.alt}
                      width={PORTRAIT_PX}
                      height={PORTRAIT_PX}
                      loading="eager"
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  </span>
                ))}
              </div>
            ) : (
              champion && (
                <Image
                  src={champion.square}
                  alt={champion.name}
                  fill
                  unoptimized
                  sizes="56px"
                  className="object-cover"
                />
              )
            )}
            <div
              ref={flashRef}
              className="pointer-events-none absolute inset-0 bg-white opacity-0"
            />
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
