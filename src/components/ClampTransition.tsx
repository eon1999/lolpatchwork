"use client";

import { useEffect, useRef } from "react";
import { createTimeline } from "animejs";

export type ClampTransitionProps = {
  /** Fires at full coverage — swap the content underneath here. */
  onCovered: () => void;
  /** Fires once the walls have pulled back off-screen. */
  onDone: () => void;
  /**
   * Optional gate held while the screen is covered. Page transitions use it to
   * wait for the next route to mount before opening onto it.
   */
  holdUntil?: () => Promise<void>;
};

const VERTICAL_MS = 420;
const HORIZONTAL_MS = 360;
const HOLD_MS = 260;

/**
 * Seals the screen and opens onto whatever replaced it: two walls close
 * vertically to meet in the middle, two more close across them horizontally,
 * then both pairs retract in reverse to reveal. Used for the end of a draft and
 * for navigation between pages.
 *
 * `holdUntil` must be stable (useCallback) — it is an effect dependency.
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ClampTransition({
  onCovered,
  onDone,
  holdUntil,
}: ClampTransitionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const coveredRef = useRef(onCovered);
  coveredRef.current = onCovered;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const top = topRef.current!;
    const bottom = bottomRef.current!;
    const left = leftRef.current!;
    const right = rightRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      let stopped = false;
      void (async () => {
        coveredRef.current();
        if (holdUntil) await holdUntil();
        if (!stopped) doneRef.current();
      })();
      return () => {
        stopped = true;
      };
    }

    let cancelled = false;
    let running: ReturnType<typeof createTimeline> | null = null;

    // Close vertically, then horizontally across it. The gold leading edges keep
    // the second pair readable even though the screen is already covered.
    function close() {
      const tl = createTimeline({ defaults: { ease: "inOut(3)" } });
      tl.add(top, { translateY: ["-100%", "0%"], duration: VERTICAL_MS }, 0);
      tl.add(bottom, { translateY: ["100%", "0%"], duration: VERTICAL_MS }, 0);
      tl.add(left, { translateX: ["-100%", "0%"], duration: HORIZONTAL_MS }, VERTICAL_MS);
      tl.add(right, { translateX: ["100%", "0%"], duration: HORIZONTAL_MS }, VERTICAL_MS);
      running = tl;
      return tl;
    }

    // Reverse, innermost pair first.
    function open() {
      const tl = createTimeline({ defaults: { ease: "inOut(3)" } });
      tl.add(left, { translateX: ["0%", "-100%"], duration: HORIZONTAL_MS }, 0);
      tl.add(right, { translateX: ["0%", "100%"], duration: HORIZONTAL_MS }, 0);
      tl.add(top, { translateY: ["0%", "-100%"], duration: VERTICAL_MS }, HORIZONTAL_MS);
      tl.add(bottom, { translateY: ["0%", "100%"], duration: VERTICAL_MS }, HORIZONTAL_MS);
      running = tl;
      return tl;
    }

    async function run() {
      await close();
      if (cancelled) return;
      coveredRef.current();
      await wait(HOLD_MS);
      if (holdUntil) await holdUntil();
      if (cancelled) return;
      await open();
      if (!cancelled) doneRef.current();
    }

    void run();
    return () => {
      cancelled = true;
      running?.pause();
    };
  }, [holdUntil]);

  return (
    <div
      ref={rootRef}
      data-clamp="root"
      className="pointer-events-none fixed inset-0 z-[95] overflow-hidden"
    >
      <div
        ref={topRef}
        data-clamp="wall"
        style={{ transform: "translateY(-100%)" }}
        className="absolute inset-x-0 top-0 h-1/2 border-b-2 border-gold/70 bg-abyss"
      />
      <div
        ref={bottomRef}
        data-clamp="wall"
        style={{ transform: "translateY(100%)" }}
        className="absolute inset-x-0 bottom-0 h-1/2 border-t-2 border-gold/70 bg-abyss"
      />
      <div
        ref={leftRef}
        data-clamp="wall"
        style={{ transform: "translateX(-100%)" }}
        className="absolute inset-y-0 left-0 w-1/2 border-r-2 border-gold/70 bg-deep"
      />
      <div
        ref={rightRef}
        data-clamp="wall"
        style={{ transform: "translateX(100%)" }}
        className="absolute inset-y-0 right-0 w-1/2 border-l-2 border-gold/70 bg-deep"
      />
    </div>
  );
}
