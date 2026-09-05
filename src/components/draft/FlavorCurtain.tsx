"use client";

import { useEffect, useMemo, useRef } from "react";
import { animate, stagger } from "animejs";

export type FlavorCurtainProps = {
  line: string;
  /** The curtain will not lift until the thing it is hiding has loaded. */
  ready: boolean;
  onFinish: () => void;
};

const DARKEN_MS = 420;
const CHAR_IN_MS = 420;
const CHAR_IN_STAGGER = 34;
const HOLD_MS = 820;
const CHAR_OUT_MS = 300;
const CHAR_OUT_STAGGER = 22;
const LIFT_MS = 520;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The dark transition into the draft: screen goes black, one flavour line types
 * itself in character by character, types itself back out, and the curtain lifts
 * onto whatever loaded behind it.
 */
export default function FlavorCurtain({ line, ready, onFinish }: FlavorCurtainProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  // Resolves the moment the caller reports the draft is loaded.
  const gate = useRef<{ promise: Promise<void>; resolve: () => void }>(null);
  if (!gate.current) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    gate.current = { promise, resolve };
  }

  useEffect(() => {
    if (ready) gate.current?.resolve();
  }, [ready]);

  const chars = useMemo(() => Array.from(line), [line]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const text = textRef.current;
    if (!overlay || !text) return;

    let cancelled = false;
    const letters = text.querySelectorAll<HTMLElement>(".flavor-char");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function run() {
      if (reduced) {
        // Reduced motion: no per-character travel, just a held title card.
        animate(letters, { opacity: [0, 1], duration: 160, ease: "linear" });
        await wait(HOLD_MS);
        await gate.current!.promise;
        if (cancelled) return;
        await animate(overlay!, { opacity: [1, 0], duration: 200, ease: "linear" });
        if (!cancelled) finishRef.current();
        return;
      }

      await animate(overlay!, { opacity: [0, 1], duration: DARKEN_MS, ease: "out(2)" });
      if (cancelled) return;

      await animate(letters, {
        opacity: [0, 1],
        translateY: [26, 0],
        scale: [0.55, 1],
        rotate: [-10, 0],
        filter: ["blur(6px)", "blur(0px)"],
        delay: stagger(CHAR_IN_STAGGER),
        duration: CHAR_IN_MS,
        ease: "out(3)",
      });
      if (cancelled) return;

      await wait(HOLD_MS);
      if (cancelled) return;

      await animate(letters, {
        opacity: [1, 0],
        translateY: [0, -28],
        scale: [1, 0.5],
        filter: ["blur(0px)", "blur(5px)"],
        delay: stagger(CHAR_OUT_STAGGER),
        duration: CHAR_OUT_MS,
        ease: "in(2)",
      });
      if (cancelled) return;

      // Whatever is still loading gets to finish under cover of the dark.
      await gate.current!.promise;
      if (cancelled) return;

      await animate(overlay!, { opacity: [1, 0], duration: LIFT_MS, ease: "inOut(2)" });
      if (!cancelled) finishRef.current();
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [line]);

  return (
    <div
      ref={overlayRef}
      aria-hidden
      style={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-abyss px-6"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 50%, rgba(200,170,110,0.09) 0%, transparent 70%)",
        }}
      />
      <p
        ref={textRef}
        className="relative text-center font-display text-4xl leading-tight tracking-wide text-gold-bright sm:text-6xl"
      >
        {chars.map((char, i) => (
          <span
            key={`${char}-${i}`}
            className="flavor-char inline-block will-change-transform"
            style={{ opacity: 0 }}
          >
            {char === " " ? " " : char}
          </span>
        ))}
      </p>
    </div>
  );
}
