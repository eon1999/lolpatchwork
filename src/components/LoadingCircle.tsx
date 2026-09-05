"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";

const SIZE = 72;
const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type LoadingCircleProps = { label?: string };

/**
 * The waiting state that the circular reveal opens out of — an arc sweeping the
 * same circle the contenders are about to be unmasked from.
 */
export default function LoadingCircle({ label }: LoadingCircleProps) {
  const arcRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const arc = arcRef.current;
    if (!arc) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const spin = animate(arc, {
      rotate: "1turn",
      duration: 1100,
      loop: true,
      ease: "linear",
    });
    const sweep = animate(arc, {
      strokeDashoffset: [CIRCUMFERENCE * 0.95, CIRCUMFERENCE * 0.35],
      duration: 900,
      alternate: true,
      loop: true,
      ease: "inOut(2)",
    });
    return () => {
      spin.revert();
      sweep.revert();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-20" role="status" aria-live="polite">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-edge/60"
        />
        <circle
          ref={arcRef}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * 0.75}
          className="text-gold"
          style={{ transformOrigin: "50% 50%" }}
        />
      </svg>
      {label && <p className="text-sm text-muted">{label}</p>}
    </div>
  );
}
