"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { getChampion, SLOT_KEYS, type SlotKey } from "@/lib/champions";

const CHAMBERS: { key: SlotKey; label: string }[] = [
  { key: "model", label: "BODY" },
  { key: "passive", label: "PASSIVE" },
  { key: "q", label: "Q" },
  { key: "w", label: "W" },
  { key: "e", label: "E" },
  { key: "r", label: "R" },
];

/** Chamber centres sit on a circle at this fraction of the wheel's radius. */
const ORBIT = 0.37;
const STEP_DEG = 360 / CHAMBERS.length;

export type RevolverWheelProps = {
  assignments: Partial<Record<SlotKey, string>>;
  onPick: (slot: SlotKey) => void;
  disabled: boolean;
  pending: SlotKey | null;
  /** Icon of the champion currently sitting in the chamber, if any. */
  loadedIcon?: string | null;
  loadedName?: string | null;
  /** Line under the hub portrait; the chamber blurbs use their own hints. */
  hubHint?: string;
};

export default function RevolverWheel({
  assignments,
  onPick,
  disabled,
  pending,
  loadedIcon,
  loadedName,
  hubHint = "pick a chamber",
}: RevolverWheelProps) {
  const ringRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const filled = SLOT_KEYS.filter((k) => assignments[k] !== undefined).length;

  // The cylinder advances one chamber per round, like the real thing.
  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rotation = filled * STEP_DEG;
    const spin = { duration: reduced ? 0 : 620, ease: "out(4)" as const };
    animate(ring, { rotate: rotation, ...spin });
    animate(ring.querySelectorAll<HTMLElement>(".chamber-face"), {
      rotate: -rotation,
      ...spin,
    });
  }, [filled]);

  // A fresh champion in the chamber makes the empty slots breathe.
  useEffect(() => {
    const ring = ringRef.current;
    if (!ring || disabled) return;
    animate(ring.querySelectorAll<HTMLElement>(".chamber-open"), {
      scale: [0.92, 1],
      opacity: [0.55, 1],
      delay: stagger(45),
      duration: 380,
      ease: "out(3)",
    });
  }, [disabled, loadedIcon]);

  useEffect(() => {
    const hub = hubRef.current;
    if (!hub || !loadedIcon) return;
    animate(hub, {
      scale: [0.8, 1],
      opacity: [0, 1],
      duration: 420,
      ease: "out(4)",
    });
  }, [loadedIcon]);

  return (
    <div className="relative aspect-square w-[min(84vw,30rem)] select-none">
      {/* Cylinder body */}
      <div className="absolute inset-0 rounded-full border border-edge/70 bg-deep/60" />
      <div className="absolute inset-[7%] rounded-full border border-edge/40" />
      <div className="absolute inset-[26%] rounded-full border border-dashed border-edge/40" />

      <div ref={ringRef} className="absolute inset-0 will-change-transform">
        {CHAMBERS.map(({ key, label }, i) => {
          const rad = ((-90 + i * STEP_DEG) * Math.PI) / 180;
          const champId = assignments[key];
          const champ = champId ? getChampion(champId) : undefined;
          const isPending = pending === key;
          const locked = Boolean(champ);
          const icon = champ
            ? key === "model"
              ? champ.loading
              : champ.abilities[key].icon
            : null;

          return (
            <div
              key={key}
              className="absolute"
              style={{
                left: `${50 + ORBIT * 100 * Math.cos(rad)}%`,
                top: `${50 + ORBIT * 100 * Math.sin(rad)}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="chamber-face">
                <div className="relative">
                  <button
                    type="button"
                    disabled={locked || disabled}
                    onClick={() => onPick(key)}
                    aria-label={
                      locked
                        ? `${label} — filled by ${champ!.name}`
                        : `Put this champion in ${label}`
                    }
                    className={`group relative flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-full border-2 transition-colors sm:h-24 sm:w-24 ${
                      locked
                        ? "chamber-filled cursor-default border-edge/70 bg-panel/80"
                        : isPending
                          ? "border-gold bg-gold/25"
                          : disabled
                            ? "border-edge/50 bg-deep/70 opacity-45"
                            : "chamber-open slot-glow border-dashed border-gold/60 bg-panel hover:border-gold hover:bg-gold/15"
                    }`}
                  >
                    {icon ? (
                      <>
                        <Image
                          src={icon}
                          alt=""
                          fill
                          unoptimized={key === "model"}
                          sizes="96px"
                          className="object-cover opacity-70"
                        />
                        <span className="absolute inset-0 bg-abyss/35" />
                      </>
                    ) : (
                      <span
                        className={`font-display text-3xl ${
                          isPending ? "text-gold-bright" : "text-muted/60 group-hover:text-gold"
                        }`}
                      >
                        {isPending ? "?" : "+"}
                      </span>
                    )}
                  </button>
                  {/* Straddles the chamber's bottom edge rather than sitting under it. */}
                  <span
                    className={`pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 whitespace-nowrap rounded-md border px-2.5 py-0.5 font-display text-base leading-tight tracking-widest shadow-lg shadow-black/50 sm:text-lg ${
                      locked
                        ? "border-edge/80 bg-panel text-muted/80"
                        : isPending
                          ? "border-gold bg-gold/25 text-gold-bright"
                          : "border-gold/70 bg-panel text-gold"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {locked && (
                  <div className="mt-4 text-center">
                    <span className="max-w-[7rem] truncate text-[11px] text-muted/70">
                      {champ!.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hub: what is loaded right now, and how far along the cylinder is. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 w-[9rem] -translate-x-1/2 -translate-y-1/2 text-center">
        {loadedIcon ? (
          <div ref={hubRef}>
            <span className="relative mx-auto block h-16 w-16 overflow-hidden rounded-full border-2 border-gold/70 shadow-lg shadow-black/50">
              <Image src={loadedIcon} alt="" fill unoptimized sizes="64px" className="object-cover" />
            </span>
            <div className="mt-2 truncate font-display text-sm tracking-wide text-gold-bright">
              {loadedName}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted">{hubHint}</div>
          </div>
        ) : (
          <div className="font-display text-2xl tracking-widest text-muted/70">{filled}/6</div>
        )}
      </div>
    </div>
  );
}
