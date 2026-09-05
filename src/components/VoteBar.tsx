"use client";

import { useState } from "react";

export type VoteChoice = "a" | "b";

export default function VoteBar({
  onVote,
  disabled,
}: {
  onVote: (winner: VoteChoice) => void;
  disabled: boolean;
}) {
  const [hover, setHover] = useState<VoteChoice | null>(null);
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        disabled={disabled}
        onClick={() => onVote("a")}
        onMouseEnter={() => setHover("a")}
        onMouseLeave={() => setHover(null)}
        className={`rounded-lg border py-3 font-display text-xl tracking-wide transition-colors ${
          hover === "a"
            ? "border-teal bg-teal/20 text-teal"
            : "border-teal/60 bg-panel text-teal/90 hover:bg-teal/10"
        } disabled:opacity-40`}
      >
        A WINS
      </button>
      <button
        disabled={disabled}
        onClick={() => onVote("b")}
        onMouseEnter={() => setHover("b")}
        onMouseLeave={() => setHover(null)}
        className={`rounded-lg border py-3 font-display text-xl tracking-wide transition-colors ${
          hover === "b"
            ? "border-blood bg-blood/20 text-red-300"
            : "border-blood/60 bg-panel text-red-300/90 hover:bg-blood/10"
        } disabled:opacity-40`}
      >
        B WINS
      </button>
    </div>
  );
}
