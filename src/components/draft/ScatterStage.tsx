"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { animate, createSpring, cubicBezier, random, stagger, utils } from "animejs";
import { CHAMPION_IDS, getChampion, type Champion } from "@/lib/champions";

const BOX = 192;
const ICON = 44;
const ICON_COUNT = 24;
const WINNER = 128;

const RATTLE_MS = 360;
const BURST_MS = 600;
const FLOAT_MS = 720;
const VACUUM_MS = 340;
const HOLD_MS = 480;
const FLIGHT_MS = 600;
/** The whole sequence is ~3.5s; this only fires if something never resolves. */
const SCATTER_TIMEOUT_MS = 8000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDecor() {
  const id = CHAMPION_IDS[Math.floor(Math.random() * CHAMPION_IDS.length)];
  return { src: getChampion(id)!.square, alt: id };
}

export type ScatterStageProps = {
  /** Null while /reveal is still in flight — the sequence never starts on a guess. */
  champion: Champion | null;
  /** Where the winner flies once it has popped. */
  dockRef: RefObject<HTMLDivElement | null>;
  onDocked: () => void;
};

/**
 * The gacha roll: a crate rattles, its contents spray across the screen, hover,
 * get vacuumed back in — and then the drawn champion springs out of the box.
 */
export default function ScatterStage({ champion, dockRef, onDocked }: ScatterStageProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const winnerRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const [landed, setLanded] = useState(false);

  const dockedRef = useRef(onDocked);
  dockedRef.current = onDocked;

  const decor = useMemo(() => Array.from({ length: ICON_COUNT }, randomDecor), []);

  useEffect(() => {
    animate(backdropRef.current!, { opacity: [0, 1], duration: 260, ease: "out(2)" });
  }, []);

  // The box breathes while the reveal is still in flight.
  useEffect(() => {
    if (champion) return;
    const box = boxRef.current;
    if (!box) return;
    animate(box, { scale: [1, 1.04], duration: 820, alternate: true, loop: true, ease: "inOut(2)" });
    return () => {
      utils.remove(box);
    };
  }, [champion]);

  // The champion's name types itself in once the winner has popped.
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

  // Deliberately no "already started" guard here, same as RollStage: Strict
  // Mode runs this twice and the cancelled first pass must leave listeners live.
  useEffect(() => {
    if (!champion) return;

    let cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function run() {
      const box = boxRef.current!;
      const winner = winnerRef.current;
      const flash = flashRef.current;
      const ring = ringRef.current;
      const nameEl = nameRef.current;
      const icons = Array.from(box.querySelectorAll<HTMLElement>(".scatter-icon"));

      // Neutralise whatever a cancelled earlier pass left on the elements.
      utils.remove([...icons, box, ...(winner ? [winner] : [])]);
      utils.set(icons, { translateX: 0, translateY: 0, rotate: 0, scale: 0.15, opacity: 0 });
      utils.set(box, { translateX: 0, translateY: 0, rotate: 0, scale: 1, opacity: 1 });
      if (winner) utils.set(winner, { translateX: 0, translateY: 0, rotate: 0, scale: 0, opacity: 0 });

      if (reduced) {
        setLanded(true);
        if (winner) utils.set(winner, { opacity: 1, scale: 1, rotate: 0 });
        if (flash) animate(flash, { opacity: [0.1, 0], duration: 150, ease: "linear" });
        await wait(200);
        return;
      }

      // 1. Rattle — something is inside.
      animate(box, {
        rotate: [0, -2.5, 2, -1.5, 1, 0],
        duration: RATTLE_MS,
        ease: "inOut(2)",
      });
      animate(icons, {
        opacity: [0, 0.9],
        scale: [0.1, 0.3],
        duration: 240,
        delay: stagger(6),
        ease: "out(2)",
      });
      await wait(RATTLE_MS);
      if (cancelled) return;

      // 2. Burst — the contents spray out across the screen.
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      animate(icons, {
        translateX: () => random(-vw * 0.36, vw * 0.36),
        translateY: () => random(-vh * 0.3, vh * 0.3),
        rotate: () => random(-240, 240),
        scale: () => random(0.7, 1.3),
        duration: BURST_MS,
        ease: "out(3)",
        delay: stagger(6),
      });
      await wait(BURST_MS * 0.8);
      if (cancelled) return;

      // 3. Hover — the cloud drifts in place while the box decides.
      for (const icon of icons) {
        animate(icon, {
          translateY: `+=${random(-14, 14)}`,
          rotate: `+=${random(-20, 20)}`,
          duration: random(500, 800),
          alternate: true,
          loop: true,
          ease: "inOut(2)",
        });
      }
      await wait(FLOAT_MS);
      if (cancelled) return;

      // 4. Vacuum — everything is sucked back in.
      utils.remove(icons);
      animate(icons, {
        translateX: 0,
        translateY: 0,
        rotate: 0,
        scale: 0.1,
        opacity: 0,
        duration: VACUUM_MS,
        ease: "in(3)",
        delay: stagger(3),
      });
      animate(box, { scale: [1, 0.9, 1], duration: 260, delay: VACUUM_MS - 60, ease: "out(2)" });
      await wait(VACUUM_MS + 120);
      if (cancelled) return;

      // 5. Pop — the drawn champion springs out of the box.
      setLanded(true);
      if (flash) animate(flash, { opacity: [0.4, 0], duration: 240, ease: "out(2)" });
      if (ring) {
        animate(ring, { scale: [0.4, 1.8], opacity: [0.9, 0], duration: 620, ease: "out(3)" });
      }
      animate(box, { translateX: [0, -6, 6, -3, 3, 0], duration: 220 });
      if (winner) {
        utils.set(winner, { opacity: 1 });
        await animate(winner, {
          scale: [0, 1],
          rotate: [random(-12, 12), 0],
          ease: createSpring({ stiffness: 240, damping: 12 }),
        });
      }
      if (cancelled) return;

      await wait(HOLD_MS);
    }

    void (async () => {
      await Promise.race([run(), wait(SCATTER_TIMEOUT_MS)]);
      if (cancelled) return;

      // 6. FLIP: carry the winner down into the dock in one move.
      const winner = winnerRef.current;
      const dock = dockRef.current;
      const nameEl = nameRef.current;
      const reducedFlight = reduced ? 160 : FLIGHT_MS;

      if (!winner || !dock) {
        dockedRef.current();
        return;
      }

      if (nameEl) animate(nameEl, { opacity: 0, duration: 160, ease: "linear" });
      animate(boxRef.current!, {
        opacity: 0,
        scale: 0.55,
        duration: reducedFlight,
        ease: "in(2)",
      });
      const from = winner.getBoundingClientRect();
      const to = dock.getBoundingClientRect();
      const scale = to.width / from.width;
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      animate(backdropRef.current!, { opacity: 0, duration: reducedFlight, ease: "linear" });
      await animate(winner, {
        translateX: dx,
        translateY: dy,
        scale,
        duration: reducedFlight,
        ease: cubicBezier(0.6, 0, 0.2, 1),
      });
      if (!cancelled) dockedRef.current();
    })();

    return () => {
      cancelled = true;
      const box = boxRef.current;
      const winner = winnerRef.current;
      const targets: (HTMLElement | null)[] = box
        ? [box, winner, ...Array.from(box.querySelectorAll<HTMLElement>(".scatter-icon"))]
        : [winner];
      utils.remove(targets.filter(Boolean) as HTMLElement[]);
    };
  }, [champion, dockRef]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden">
      <div
        ref={backdropRef}
        style={{ opacity: 0 }}
        className="absolute inset-0 bg-abyss/80 backdrop-blur-sm"
      />
      <div className="relative flex flex-col items-center">
        <div
          ref={boxRef}
          style={{ width: BOX, height: BOX }}
          className="relative rounded-2xl border-2 border-gold/50 bg-deep shadow-2xl shadow-black/70 will-change-transform"
        >
          <div className="absolute inset-2 rounded-xl border border-dashed border-edge/40" />
          <div className="absolute inset-x-4 top-4 h-px bg-gold/25" />

          <div
            ref={ringRef}
            aria-hidden
            style={{
              width: BOX,
              height: BOX,
              marginLeft: -BOX / 2,
              marginTop: -BOX / 2,
              opacity: 0,
            }}
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border-2 border-gold"
          />

          {decor.map((item, i) => (
            <div key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <span
                className="scatter-icon block overflow-hidden rounded-md border border-edge/70"
                style={{ width: ICON, height: ICON, opacity: 0 }}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={ICON}
                  height={ICON}
                  loading="eager"
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </span>
            </div>
          ))}

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              ref={winnerRef}
              style={{ width: WINNER, height: WINNER, opacity: 0 }}
              className="overflow-hidden rounded-lg border-2 border-gold shadow-2xl shadow-black/80 will-change-transform"
            >
              {champion && (
                <Image
                  src={champion.square}
                  alt={champion.name}
                  width={WINNER}
                  height={WINNER}
                  loading="eager"
                  unoptimized
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>

          <div
            ref={flashRef}
            className="pointer-events-none absolute inset-0 rounded-2xl bg-white opacity-0"
          />
        </div>

        {/* Reserved height so the name arriving doesn't shift the box. */}
        <div ref={nameRef} className="mt-6 h-10 text-center">
          {landed && champion && (
            <div className="font-display text-3xl tracking-wide text-gold-bright">
              {Array.from(champion.name).map((char, i) => (
                <span
                  key={`${char}-${i}`}
                  className="roll-name-char inline-block"
                  style={{ opacity: 0 }}
                >
                  {char === " " ? " " : char}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
