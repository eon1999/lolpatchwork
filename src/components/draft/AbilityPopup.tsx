"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { fetchAbilityDetail, type AbilityDetail } from "@/lib/ddragon";
import type { Ability, SlotKey } from "@/lib/champions";

export type AbilityPopupProps = {
  /** The source champion, by id and name only: enough for the CDN and the byline. */
  championId: string;
  championName: string;
  slot: Exclude<SlotKey, "model">;
  ability: Ability;
  onClose: () => void;
  /** Where the popup grows from — match it to the icon it is anchored to. */
  origin?: string;
};

const SLOT_LABEL: Record<Exclude<SlotKey, "model">, string> = {
  passive: "PASSIVE",
  q: "Q",
  w: "W",
  e: "E",
  r: "R",
};

/** "What does this actually do?" — expands out of the ability icon it belongs to. */
export default function AbilityPopup({
  championId,
  championName,
  slot,
  ability,
  onClose,
  origin = "bottom left",
}: AbilityPopupProps) {
  const [detail, setDetail] = useState<AbilityDetail | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Bundled copy shows instantly; Riot's CDN fills in the fuller tooltip after.
  useEffect(() => {
    let active = true;
    setDetail(null);
    void fetchAbilityDetail(championId, slot).then((result) => {
      if (active) setDetail(result);
    });
    return () => {
      active = false;
    };
  }, [championId, slot]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      animate(card, { opacity: [0, 1], duration: 140, ease: "linear" });
      return;
    }
    animate(card, {
      opacity: [0, 1],
      scaleX: [0.55, 1],
      scaleY: [0.3, 1],
      translateY: [18, 0],
      duration: 420,
      ease: "out(4)",
    });
    animate(card.querySelectorAll<HTMLElement>(".popup-line"), {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(45, { start: 110 }),
      duration: 280,
      ease: "out(2)",
    });
  }, [slot, championId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const stats = (
    [
      ["cd", detail?.cooldown ?? ability.cooldown],
      ["cost", detail?.cost ?? ability.cost],
      ["range", detail?.range ?? ability.range],
    ] as const
  )
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label} ${value}`);

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`${ability.name} details`}
      style={{ transformOrigin: origin, opacity: 0 }}
      className="w-[min(88vw,26rem)] rounded-xl border border-gold/50 bg-panel-raised/95 p-3.5 shadow-2xl shadow-black/70 backdrop-blur"
    >
      <div className="popup-line flex items-start gap-3">
        <Image
          src={ability.icon}
          alt=""
          width={44}
          height={44}
          unoptimized
          className="h-11 w-11 shrink-0 rounded-md border border-edge/80 object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-sm tracking-widest text-gold">
              {SLOT_LABEL[slot]}
            </span>
            <span className="truncate text-sm font-semibold text-gold-bright">{ability.name}</span>
          </div>
          <div className="truncate text-[11px] text-muted">from {championName}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded px-1 text-muted transition-colors hover:text-gold"
        >
          ✕
        </button>
      </div>

      <p className="popup-line mt-2.5 whitespace-pre-line border-l-2 border-gold/40 pl-3 text-xs leading-relaxed text-gold-bright/85">
        {detail?.description || ability.description}
      </p>

      {detail?.tooltip && detail.tooltip !== detail.description && (
        <p className="popup-line mt-2 whitespace-pre-line pl-3 text-[11px] leading-relaxed text-muted">
          {detail.tooltip}
        </p>
      )}

      {stats.length > 0 && (
        <div className="popup-line mt-2.5 flex flex-wrap gap-1.5">
          {stats.map((stat) => (
            <span
              key={stat}
              className="rounded border border-edge/70 bg-panel px-1.5 py-0.5 text-[10px] text-muted"
            >
              {stat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
