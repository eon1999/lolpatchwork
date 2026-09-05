"use client";

import { useState } from "react";

export function UpvoteButton({
  creationId,
  initialCount,
  initialUpvoted,
}: {
  creationId: string;
  initialCount: number;
  initialUpvoted: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/creations/${creationId}/upvote`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setCount(json.data.upvotes);
        setUpvoted(json.data.upvoted);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        upvoted
          ? "border-gold bg-gold/15 text-gold"
          : "border-edge bg-panel text-muted hover:border-gold/60 hover:text-gold"
      }`}
      aria-pressed={upvoted}
    >
      <span aria-hidden>{upvoted ? "▲" : "△"}</span>
      {count}
    </button>
  );
}

export function ReportButton({
  creationId,
  targetType = "creation",
}: {
  creationId: string;
  targetType?: "creation" | "comment";
}) {
  const [state, setState] = useState<"idle" | "confirm" | "done">("idle");

  async function report() {
    await fetch(`/api/creations/${creationId}/report`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "" }),
    });
    setState("done");
  }

  if (state === "done") return <span className="text-xs text-muted/60">reported</span>;
  if (state === "confirm")
    return (
      <span className="flex items-center gap-2 text-xs">
        <button onClick={report} className="text-blood hover:underline">
          confirm report
        </button>
        <button onClick={() => setState("idle")} className="text-muted hover:underline">
          cancel
        </button>
      </span>
    );
  void targetType;
  return (
    <button onClick={() => setState("confirm")} className="text-xs text-muted/50 hover:text-blood">
      report
    </button>
  );
}
