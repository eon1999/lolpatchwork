"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import LoadingCircle from "@/components/LoadingCircle";
import VoteBar, { type VoteChoice } from "@/components/VoteBar";
import BattleCard from "@/components/battle/BattleCard";
import {
  playClash,
  playVerdict,
  prefersReducedMotion,
  resetCards,
  swipeIn,
  swipeOut,
} from "@/lib/battleAnimation";
import type { CreationCard } from "@/lib/creations";

type Pair = {
  pairToken: string;
  coldStart: boolean;
  a: CreationCard;
  b: CreationCard;
};

type Split = { aPercent: number; bPercent: number; total: number };

/** idle = waiting on a vote; the rest are the beats that play out after one. */
type Phase = "idle" | "clashing" | "verdict" | "swiping";

export default function BattleClient() {
  const [pair, setPair] = useState<Pair | null>(null);
  const [split, setSplit] = useState<Split | null>(null);
  const [winner, setWinner] = useState<VoteChoice | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stopped, setStopped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealKey, setRevealKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const stageRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  const loadPair = useCallback(async () => {
    setError(null);
    setSplit(null);
    setWinner(null);
    resetCards(aRef.current, bRef.current);
    setLoading(true);
    try {
      const res = await fetch("/api/battle");
      const json = await res.json();
      if (json.ok) {
        setPair(json.data);
        setRevealKey((n) => n + 1);
      } else {
        setError(json.error?.message ?? "Couldn't find a battle.");
      }
    } catch {
      setError("Couldn't find a battle.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPair();
  }, [loadPair]);

  /**
   * The first matchup is unmasked by a circle opening out of the middle, picking
   * up where the loading ring left off. Every later one swipes in instead, so
   * this is scoped to the first reveal only.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (revealKey !== 1 || !stage) return;
    if (prefersReducedMotion()) {
      stage.style.clipPath = "";
      return;
    }
    const mask = { radius: 0 };
    stage.style.clipPath = "circle(0% at 50% 50%)";
    const reveal = animate(mask, {
      radius: 120,
      duration: 760,
      ease: "out(3)",
      onUpdate: () => {
        stage.style.clipPath = `circle(${mask.radius}% at 50% 50%)`;
      },
      // Clipping is only for the entrance; leave popups free to overflow after.
      onComplete: () => {
        stage.style.clipPath = "";
      },
    });
    return () => {
      reveal.revert();
      stage.style.clipPath = "";
    };
  }, [revealKey]);

  /**
   * The vote is posted while the cards are still clashing, so the verdict lands
   * on a result we already hold rather than on a spinner.
   */
  async function vote(choice: VoteChoice) {
    if (!pair || phase !== "idle") return;
    setPhase("clashing");
    setWinner(choice);
    setError(null);

    const posted = fetch("/api/battle/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pairToken: pair.pairToken, winner: choice }),
    })
      .then((res) => res.json())
      .catch(() => null);

    const a = aRef.current;
    const b = bRef.current;
    const clashed = a && b ? playClash(a, b, flashRef.current) : Promise.resolve();

    const [json] = await Promise.all([posted, clashed]);

    if (!json?.ok) {
      const code = json?.error?.code;
      resetCards(a, b);
      setWinner(null);
      setPhase("idle");
      if (code === "STALE_PAIR" || code === "SELF_VOTE") {
        void loadPair();
        return;
      }
      setError(json?.error?.message ?? "Vote failed.");
      return;
    }

    setSplit(json.data.split);
    if (a && b) {
      await playVerdict(choice === "a" ? a : b, choice === "a" ? b : a);
    }
    setPhase("verdict");
  }

  /** Swipe the settled matchup out to the left, bring the next one in from the right. */
  const nextMatchup = useCallback(async () => {
    setStopped(false);
    setPhase("swiping");
    const stage = stageRef.current;
    if (stage) await swipeOut(stage);
    await loadPair();
    if (stageRef.current) await swipeIn(stageRef.current);
    setPhase("idle");
  }, [loadPair]);

  if (loading && !pair && !error) {
    return <LoadingCircle label="finding opponents" />;
  }
  if (error && !pair) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted">{error}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => void loadPair()}
            className="rounded-lg border border-gold/60 bg-panel px-4 py-2 font-display tracking-wide text-gold transition-colors hover:bg-gold/10"
          >
            TRY AGAIN
          </button>
          <Link
            href="/gallery"
            className="rounded-lg border border-edge px-4 py-2 font-display tracking-wide text-muted transition-colors hover:border-muted hover:text-gold-bright"
          >
            GALLERY
          </Link>
        </div>
      </div>
    );
  }
  if (!pair) return null;

  const winnerName = winner === "a" ? pair.a.name : winner === "b" ? pair.b.name : null;

  return (
    <div>
      <h1 className="text-center font-display text-2xl tracking-wide text-gold-bright">
        WHICH ONE WINS THE 1V1?
      </h1>
      {pair.coldStart && (
        <p className="mt-1 text-center text-xs text-muted">still warming up - matchups are random</p>
      )}

      <div ref={stageRef} className="mt-6">
        <div className="relative grid gap-4 md:grid-cols-2">
          <BattleCard ref={aRef} card={pair.a} side="a" />
          <BattleCard ref={bRef} card={pair.b} side="b" />
          {/* The spark the two cards meet on, so each hit lands on something. The
              centring lives on the wrapper: the inner div's transform is anime's. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
          >
            <div ref={flashRef} className="battle-spark h-32 w-32 rounded-full opacity-0" />
          </div>
        </div>
      </div>

      <div className="mt-5">
        {phase !== "verdict" ? (
          <VoteBar onVote={vote} disabled={phase !== "idle"} />
        ) : stopped ? (
          <div className="rounded-xl border border-edge/70 bg-panel-raised/80 p-5 text-center">
            <p className="font-display text-xl tracking-wide text-gold">THANKS FOR JUDGING</p>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => void nextMatchup()}
                className="rounded-lg border border-gold/60 bg-panel px-4 py-2 font-display tracking-wide text-gold transition-colors hover:bg-gold/10"
              >
                ACTUALLY, ONE MORE
              </button>
              <Link
                href="/leaderboard"
                className="rounded-lg border border-edge px-4 py-2 font-display tracking-wide text-muted transition-colors hover:border-muted hover:text-gold-bright"
              >
                LEADERBOARD
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gold/40 bg-panel-raised/80 p-4 text-center">
            <p className="font-display text-2xl tracking-wide text-gold">{winnerName} TAKES IT</p>
            {split && (
              <>
                <div className="mt-3 flex h-2.5 overflow-hidden rounded-full border border-edge/80">
                  <div className="bg-teal" style={{ width: `${split.aPercent}%` }} />
                  <div className="bg-blood" style={{ width: `${split.bPercent}%` }} />
                </div>
                <div className="mt-1.5 flex items-baseline justify-between text-xs">
                  <span className="text-teal">A {split.aPercent}%</span>
                  <span className="text-muted">
                    {split.total} vote{split.total === 1 ? "" : "s"} on this matchup
                  </span>
                  <span className="text-red-300">B {split.bPercent}%</span>
                </div>
              </>
            )}
            <p className="mt-4 text-sm text-muted">Keep judging?</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => void nextMatchup()}
                className="rounded-lg border border-gold/60 bg-panel px-5 py-2.5 font-display text-lg tracking-wide text-gold transition-colors hover:bg-gold/10"
              >
                NEXT MATCHUP
              </button>
              <button
                onClick={() => setStopped(true)}
                className="rounded-lg border border-edge px-5 py-2.5 font-display text-lg tracking-wide text-muted transition-colors hover:border-muted hover:text-gold-bright"
              >
                I&apos;M DONE
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-center text-sm text-blood">{error}</p>}
      <p className="mt-6 text-center text-[11px] text-muted/60">
        hover an ability to see what it does · you can&apos;t vote on your own creations · you see
        each pair at most once a week
      </p>
    </div>
  );
}
