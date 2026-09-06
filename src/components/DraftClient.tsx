"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChampionDock from "@/components/draft/ChampionDock";
import FlavorCurtain from "@/components/draft/FlavorCurtain";
import RevolverWheel from "@/components/draft/RevolverWheel";
import RollStage from "@/components/draft/RollStage";
import ClampTransition from "@/components/ClampTransition";
import PublishForm from "@/components/draft/PublishForm";
import ReleasedCard from "@/components/draft/ReleasedCard";
import RollStylePicker from "@/components/draft/RollStylePicker";
import ScatterStage from "@/components/draft/ScatterStage";
import { getChampion, SLOT_KEYS, type Champion, type SlotKey } from "@/lib/champions";
import { randomFlavorLine } from "@/lib/flavor";
import { useRollStyle } from "@/lib/rollStyle";
import type { CreationCard } from "@/lib/creations";

/**
 * curtain  — dark screen + flavour line while the draft is created and dealt
 * rolling  — big centre-screen reel, then the flight into the dock
 * placing  — pick a chamber on the revolver
 * sealing  — the clamp closes over the finished draft
 * publish  — name it
 * done     — released
 */
type Phase = "curtain" | "rolling" | "placing" | "sealing" | "publish" | "done";

const TOTAL_SLOTS = SLOT_KEYS.length;

export default function DraftClient() {
  const [phase, setPhase] = useState<Phase>("curtain");
  const [flavor, setFlavor] = useState<string | null>(null);
  const [curtainUp, setCurtainUp] = useState(false);
  const [clamping, setClamping] = useState(false);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [current, setCurrent] = useState<Champion | null>(null);
  const [round, setRound] = useState(0);
  const [assignments, setAssignments] = useState<Partial<Record<SlotKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ slot: SlotKey; championId: string } | null>(null);
  const [confirmSlot, setConfirmSlot] = useState<SlotKey | null>(null);
  /**
   * True from the moment an assignment is sent until the next reveal takes over.
   * Without it the wheel is briefly live again after the undo window closes but
   * before the roll starts, and a fast click assigns the same champion twice.
   */
  const [committing, setCommitting] = useState(false);

  const [published, setPublished] = useState<CreationCard | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [rollStyle] = useRollStyle();
  /** Read inside revealNext without churning its identity on every switch. */
  const rollStyleRef = useRef(rollStyle);
  rollStyleRef.current = rollStyle;

  const dockPortraitRef = useRef<HTMLDivElement>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);
  const draftIdRef = useRef<string | null>(null);
  /** Slots the server has actually accepted — the optimistic UI count can run ahead. */
  const committed = useRef(0);

  const filledCount = Object.keys(assignments).length;
  const remainingSlots = TOTAL_SLOTS - filledCount;

  const call = useCallback(async (url: string, body?: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error?.message ?? "Something broke.");
    return json.data;
  }, []);

  // Chosen on the client so the server render can't disagree about which line it is.
  useEffect(() => {
    setFlavor(randomFlavorLine());
  }, []);

  const revealNext = useCallback(
    async (id: string) => {
      setCurrent(null);
      setError(null);
      setPhase("rolling");
      try {
        // AC §2.8: the spin does not start until /reveal resolves.
        const data = await call(`/api/draft/${id}/reveal`);
        setCurrent(data.champion as Champion);
        setRound(data.index + 1);
        // Insta roll: no stage, the champion goes straight to the dock.
        if (rollStyleRef.current === "insta") setPhase("placing");
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reveal failed.");
        setPhase("placing");
        return false;
      }
    },
    [call],
  );

  // Kick the whole thing off behind the curtain — nobody sees a spinner.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const data = await call("/api/draft");
        draftIdRef.current = data.draftId as string;
        setDraftId(data.draftId as string);
        await revealNext(data.draftId as string);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't start the draft.");
        setPhase("placing");
      }
    })();
  }, [call, revealNext]);

  const commitAssign = useCallback(
    async (slot: SlotKey) => {
      const id = draftIdRef.current;
      if (!id) return;
      setCommitting(true);
      try {
        await call(`/api/draft/${id}/assign`, { slot });
        committed.current += 1;
        if (committed.current >= TOTAL_SLOTS) {
          setPhase("sealing");
          setClamping(true);
          return;
        }
        await revealNext(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Assign failed.");
        setPhase("placing");
      } finally {
        setCommitting(false);
      }
    },
    [call, revealNext],
  );

  function pickSlot(slot: SlotKey) {
    if (!current || phase !== "placing" || undo || committing) return;
    const needsConfirm = remainingSlots <= 2 && remainingSlots > 1;
    if (needsConfirm && confirmSlot !== slot) {
      setConfirmSlot(slot);
      return;
    }
    setConfirmSlot(null);
    const championId = current.id;

    if (remainingSlots > 2) {
      // One click commits, 1.5s undo window (SPEC §1.2).
      setAssignments((a) => ({ ...a, [slot]: championId }));
      setUndo({ slot, championId });
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => {
        setUndo(null);
        void commitAssign(slot);
      }, 1500);
      return;
    }
    setAssignments((a) => ({ ...a, [slot]: championId }));
    void commitAssign(slot);
  }

  function undoAssign() {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setAssignments((a) => {
      const next = { ...a };
      delete next[undo.slot];
      return next;
    });
    setUndo(null);
  }

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  // Prefill the name from whatever ended up wearing the body.
  useEffect(() => {
    if (phase !== "publish") return;
    setName((existing) => existing || getChampion(assignments.model ?? "")?.name || "");
  }, [phase, assignments]);

  async function publish() {
    if (!draftId || publishing) return;
    setPublishing(true);
    setError(null);
    try {
      const data = await call(`/api/draft/${draftId}/publish`, {
        name: name.trim() || getChampion(assignments.model ?? "")?.name || "Unnamed Thing",
        tagline: tagline.trim(),
      });
      const res = await fetch(`/api/creations/${data.creationId}`);
      const json = await res.json();
      if (json.ok) setPublished(json.data as CreationCard);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  }

  async function share() {
    if (!published) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/c/${published.id}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  // The roll stays hidden until the curtain has actually lifted off it.
  const rolling = phase === "rolling" && curtainUp && rollStyle !== "insta";

  // Flipping to insta while a roll is mid-flight must not strand the draft:
  // the reveal already landed, so dock it immediately.
  useEffect(() => {
    if (rollStyle === "insta" && phase === "rolling" && current) {
      setPhase("placing");
    }
  }, [rollStyle, phase, current]);

  return (
    <>
      {phase === "done" && published ? (
        <ReleasedCard card={published} shareCopied={shareCopied} onShare={share} />
      ) : phase === "publish" ? (
        <PublishForm
          name={name}
          tagline={tagline}
          assignments={assignments}
          publishing={publishing}
          error={error}
          onNameChange={setName}
          onTaglineChange={setTagline}
          onPublish={publish}
        />
      ) : (
        <div className="relative flex min-h-[calc(100dvh-14rem)] flex-col items-center justify-center py-4 pb-40 sm:pb-4">
          {flavor && !curtainUp && (
            <FlavorCurtain
              line={flavor}
              ready={Boolean(current) || Boolean(error)}
              onFinish={() => setCurtainUp(true)}
            />
          )}

          <RevolverWheel
            assignments={assignments}
            onPick={pickSlot}
            disabled={phase !== "placing" || !current || Boolean(undo) || committing}
            pending={confirmSlot}
            loadedIcon={phase === "placing" && current ? current.square : null}
            loadedName={current?.name ?? null}
            hubHint={undo ? "locking in..." : "pick a chamber"}
          />

          {confirmSlot && (
            <p className="mt-2 text-center text-xs text-gold">
              sure? click <b>{confirmSlot.toUpperCase()}</b> again to lock it in.
            </p>
          )}

          {error && <p className="mt-3 text-center text-sm text-blood">{error}</p>}

          {rolling &&
            (rollStyle === "scatter" ? (
              <ScatterStage
                key={round}
                champion={current}
                dockRef={dockPortraitRef}
                onDocked={() => setPhase("placing")}
              />
            ) : (
              <RollStage
                key={round}
                champion={current}
                dockRef={dockPortraitRef}
                onDocked={() => setPhase("placing")}
              />
            ))}

          <ChampionDock
            ref={dockPortraitRef}
            champion={current}
            visible={phase === "placing"}
            pop={rollStyle === "insta"}
          />

          <RollStylePicker />

          {undo && (
            <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full border border-gold/60 bg-panel-raised px-5 py-2.5 text-sm text-gold-bright shadow-xl">
              loaded into {undo.slot.toUpperCase()} ·{" "}
              <button onClick={undoAssign} className="font-semibold text-gold hover:underline">
                undo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Seals the finished draft away and opens onto the naming screen. */}
      {clamping && (
        <ClampTransition
          onCovered={() => setPhase("publish")}
          onDone={() => setClamping(false)}
        />
      )}
    </>
  );
}
