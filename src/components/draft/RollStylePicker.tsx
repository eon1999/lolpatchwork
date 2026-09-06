"use client";

import { useRollStyle, type RollStyle } from "@/lib/rollStyle";

const OPTIONS: { value: RollStyle; label: string; hint: string }[] = [
  { value: "reel", label: "REEL", hint: "Slot machine reel" },
  { value: "scatter", label: "SCATTER", hint: "Icons scatter out of a box until one pops" },
  { value: "insta", label: "INSTA", hint: "No roll screen — champions land straight in the dock" },
];

/** Segmented control for the reveal animation; lives bottom-right of the draft. */
export default function RollStylePicker() {
  const [style, setStyle] = useRollStyle();

  return (
    <div className="fixed bottom-4 right-4 z-30 rounded-xl border border-edge/70 bg-panel-raised/90 p-1.5 shadow-xl shadow-black/50 backdrop-blur">
      <div className="px-1 pb-1 pt-0.5 text-center text-[9px] uppercase tracking-widest text-muted/60">
        roll style
      </div>
      <div className="flex gap-1">
        {OPTIONS.map(({ value, label, hint }) => (
          <button
            key={value}
            type="button"
            title={hint}
            aria-pressed={style === value}
            onClick={() => setStyle(value)}
            className={`rounded-md px-2.5 py-1 font-display text-[10px] tracking-widest transition-colors ${
              style === value
                ? "border border-gold bg-gold/15 text-gold"
                : "border border-transparent text-muted hover:text-gold-bright"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
