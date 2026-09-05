"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { animate, cubicBezier, stagger } from "animejs";
import Reel, { type ReelHandle } from "@/components/Reel";
import { CHAMPION_IDS, getChampion, type Champion } from "@/lib/champions";

const BIG_SIZE = 232;
const LAND_HOLD_MS = 620;
const FLIGHT_MS = 720;
/** The reel timeline is ~2.5s; this only fires if the spin never reports back. */
const SPIN_TIMEOUT_MS = 6000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDecor() {
  const id = CHAMPION_IDS[Math.floor(Math.random() * CHAMPION_IDS.length)];
  return { src: getChampion(id)!.square, alt: id };
}

export type RollStageProps = {
  /** Null while /reveal is still in flight — the spin never starts on a guess. */
  champion: Champion | null;
  /** Where the reel flies to once it lands. */
  dockRef: RefObject<HTMLDivElement | null>;
  onDocked: () => void;
};

/**
 * Big, centre-of-screen roll. When the reel stops, the result flies down into
 * the dock in the bottom-left corner and hands the stage back.
 */
export default function RollStage({ champion, dockRef, onDocked }: RollStageProps) {
  const reelRef = useRef<ReelHandle>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const [landed, setLanded] = useState(false);

  const dockedRef = useRef(onDocked);
  dockedRef.current = onDocked;

  useEffect(() => {
    animate(backdropRef.current!, { opacity: [0, 1], duration: 260, ease: "out(2)" });
  }, []);

  // The champion's name types itself in once the reel has stopped.
  useEffect(() => {
    const nameEl = nameRef.current;
    if (!landed || !nameEl) return;
    const chars = nameEl.querySelectorAll<HTMLElement>(".roll-name-char");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    animate(chars, {
      opacity: [0, 1],
      translateY: reduced ? 0 : [12, 0],
      delay: reduced ? 0 : stagger(26),
      duration: reduced ? 140 : 260,
      ease: "out(3)",
    });
  }, [landed]);

  // Deliberately no "already started" ref guard here: Strict Mode runs this
  // effect twice, and a guard that survives the cancelled first pass would leave
  // nobody listening when the reel lands. The deps scope it to one spin per champion.
  useEffect(() => {
    if (!champion) return;

    let cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function run() {
      const spun = reelRef.current?.spin({ src: champion!.square, alt: champion!.name });
      // Never let a spin that fails to report back strand the whole draft.
      await Promise.race([spun ?? Promise.resolve(), wait(SPIN_TIMEOUT_MS)]);
      if (cancelled) return;
      setLanded(true);

      await wait(reduced ? 200 : LAND_HOLD_MS);
      if (cancelled) return;

      const nameEl = nameRef.current;

      const flyer = flyerRef.current;
      const dock = dockRef.current;
      if (!flyer || !dock) {
        dockedRef.current();
        return;
      }

      if (nameEl) {
        animate(nameEl, { opacity: 0, duration: 160, ease: "linear" });
      }

      // FLIP: measure the dock, then carry the reel there in one move.
      const from = flyer.getBoundingClientRect();
      const to = dock.getBoundingClientRect();
      const scale = to.width / from.width;
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);

      animate(backdropRef.current!, {
        opacity: 0,
        duration: reduced ? 160 : FLIGHT_MS,
        ease: "linear",
      });
      await animate(flyer, {
        translateX: dx,
        translateY: dy,
        scale,
        duration: reduced ? 160 : FLIGHT_MS,
        ease: cubicBezier(0.6, 0, 0.2, 1),
      });
      if (!cancelled) dockedRef.current();
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [champion, dockRef]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <div
        ref={backdropRef}
        style={{ opacity: 0 }}
        className="absolute inset-0 bg-abyss/80 backdrop-blur-sm"
      />
      <div className="relative flex flex-col items-center">
        <div ref={flyerRef} className="will-change-transform">
          <Reel
            ref={reelRef}
            decor={randomDecor}
            size={BIG_SIZE}
            className="border-2 border-gold/50 shadow-2xl shadow-black/70"
          />
        </div>
        {/* Reserved height so the name arriving doesn't shift the reel. */}
        <div ref={nameRef} className="mt-5 h-10 text-center">
          {landed && champion && (
            <div className="font-display text-3xl tracking-wide text-gold-bright">
              {Array.from(champion.name).map((char, i) => (
                <span
                  key={`${char}-${i}`}
                  className="roll-name-char inline-block"
                  style={{ opacity: 0 }}
                >
                  {char === " " ? " " : char}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
