"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";

/**
 * Greets logged-out visitors who press the Mine tab: make an account, yes or
 * no? Yes opens the claim form — the session's creations carry over when it
 * succeeds. No just closes the prompt and shows the page.
 */
export default function AccountPrompt({ creations }: { creations: number }) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<"ask" | "form">("ask");
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      animate(panel, { opacity: [0, 1], duration: 140, ease: "linear" });
      return;
    }
    animate(panel, {
      opacity: [0, 1],
      scale: [0.94, 1],
      translateY: [14, 0],
      duration: 300,
      ease: "out(3)",
    });
  }, [open, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Something broke.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke.");
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/80 p-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Make an account"
        className="w-full max-w-sm rounded-xl border border-gold/50 bg-panel-raised p-5 shadow-2xl shadow-black/70"
      >
        {mode === "ask" ? (
          <>
            <div className="font-display text-xl tracking-wide text-gold">MAKE AN ACCOUNT?</div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {creations > 0
                ? `You have ${creations} creation${creations === 1 ? "" : "s"} sitting in this guest session. Claim an account and they carry over — otherwise they're gone when the session ends.`
                : "An account keeps every card you release: your inventory, upvotes, record and elo, saved for good."}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("form")}
                className="flex-1 rounded-lg border border-gold bg-gold/15 py-2 text-xs text-gold transition-colors hover:bg-gold hover:text-abyss"
              >
                yes
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-edge/70 py-2 text-xs text-muted transition-colors hover:border-gold/60 hover:text-gold"
              >
                no thanks
              </button>
            </div>
          </>
        ) : (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e);
            }}
          >
            <div className="font-display text-xl tracking-wide text-gold">MAKE AN ACCOUNT</div>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-widest text-muted">username</span>
              <input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                autoFocus
                maxLength={20}
                autoComplete="username"
                className="mt-1 w-full rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-sm text-gold-bright outline-none focus:border-gold"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-widest text-muted">password</span>
              <input
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                type="password"
                maxLength={200}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-sm text-gold-bright outline-none focus:border-gold"
              />
            </label>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-lg border border-gold bg-gold/15 py-2 text-xs text-gold transition-colors hover:bg-gold hover:text-abyss disabled:opacity-50"
              >
                {busy ? "claiming..." : "create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("ask");
                  setError(null);
                }}
                className="rounded-lg border border-edge/70 px-4 py-2 text-xs text-muted transition-colors hover:border-gold/60 hover:text-gold"
              >
                back
              </button>
            </div>
          </form>
        )}
        {error && <p className="mt-2 text-xs text-blood">{error}</p>}
      </div>
    </div>
  );
}
