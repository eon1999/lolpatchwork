"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";

type Mode = "menu" | "login" | "register" | "rename";

export type AccountMenuProps = {
  initialName: string | null;
  initialUsername: string | null;
};

const TITLES: Record<Mode, string> = {
  menu: "ACCOUNT",
  login: "SIGN IN",
  register: "MAKE AN ACCOUNT",
  rename: "RENAME",
};

export default function AccountMenu({ initialName, initialUsername }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState(initialName ?? "");
  const [username, setUsername] = useState(initialUsername);
  const [form, setForm] = useState({ username: "", password: "", displayName: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  // Click-outside and Escape both dismiss the panel.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Panel drops in; its rows cascade behind it.
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    animate(panel, {
      opacity: [0, 1],
      translateY: [-10, 0],
      scale: [0.96, 1],
      duration: 260,
      ease: "out(3)",
    });
    animate(panel.querySelectorAll(".account-row"), {
      opacity: [0, 1],
      translateY: [6, 0],
      delay: stagger(35, { start: 60 }),
      duration: 220,
      ease: "out(2)",
    });
  }, [open, mode]);

  async function post(url: string, body: Record<string, string>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error?.message ?? "Something broke.");
    return json.data;
  }

  async function submit(action: Mode) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (action === "rename") {
        const data = await post("/api/user/name", { name: form.displayName.trim() });
        setName(data.name);
      } else if (action === "register") {
        const data = await post("/api/auth/register", {
          username: form.username,
          password: form.password,
        });
        setUsername(data.username);
        setName(data.displayName);
      } else if (action === "login") {
        const data = await post("/api/auth/login", {
          username: form.username,
          password: form.password,
        });
        setUsername(data.username);
        setName(data.displayName);
      }
      setForm({ username: "", password: "", displayName: "" });
      setMode("menu");
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await post("/api/auth/logout", {});
      window.location.reload();
    } catch {
      setBusy(false);
      setError("Couldn't sign out.");
    }
  }

  const label = username ? `@${username}` : name || "guest";

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          setMode("menu");
          setError(null);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
          open
            ? "border-gold bg-gold/10 text-gold-bright"
            : "border-edge/80 text-muted hover:border-gold/60 hover:text-gold"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${username ? "bg-teal" : "bg-muted/50"}`}
          aria-hidden
        />
        <span className="max-w-[10rem] truncate">{label}</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Account"
          className="absolute right-0 top-11 z-50 w-72 origin-top-right rounded-xl border border-edge bg-panel-raised p-4 shadow-2xl shadow-black/60"
        >
          <div className="account-row font-display text-lg tracking-wide text-gold">
            {TITLES[mode]}
          </div>

          {mode === "menu" && (
            <div className="mt-3 space-y-2">
              <div className="account-row rounded-lg border border-edge/70 bg-panel px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-muted">signed in as</div>
                <div className="truncate text-sm text-gold-bright">{name || "guest"}</div>
                <div className="truncate text-[11px] text-muted">
                  {username ? `@${username}` : "anonymous session"}
                </div>
              </div>
              {username ? (
                <>
                  <MenuButton onClick={() => setMode("rename")}>change display name</MenuButton>
                  <MenuButton onClick={signOut} disabled={busy}>
                    sign out
                  </MenuButton>
                </>
              ) : (
                <>
                  <MenuButton onClick={() => setMode("register")} primary>
                    make an account
                  </MenuButton>
                  <MenuButton onClick={() => setMode("login")}>sign in</MenuButton>
                  <MenuButton onClick={() => setMode("rename")}>change display name</MenuButton>
                  <p className="account-row pt-1 text-[11px] leading-relaxed text-muted/80">
                    Keeps this session&apos;s creations if you claim it now.
                  </p>
                </>
              )}
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(mode);
              }}
            >
              <Field
                label="username"
                value={form.username}
                autoFocus
                autoComplete="username"
                maxLength={20}
                onChange={(v) => setForm((f) => ({ ...f, username: v }))}
              />
              <Field
                label="password"
                type="password"
                value={form.password}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                maxLength={200}
                onChange={(v) => setForm((f) => ({ ...f, password: v }))}
              />
              <SubmitRow
                busy={busy}
                label={mode === "register" ? "create" : "sign in"}
                onBack={() => {
                  setMode("menu");
                  setError(null);
                }}
              />
            </form>
          )}

          {mode === "rename" && (
            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit("rename");
              }}
            >
              <Field
                label="display name"
                value={form.displayName}
                autoFocus
                maxLength={24}
                onChange={(v) => setForm((f) => ({ ...f, displayName: v }))}
              />
              <p className="account-row text-[11px] text-muted/80">Once every 24 hours.</p>
              <SubmitRow
                busy={busy}
                label="save"
                onBack={() => {
                  setMode("menu");
                  setError(null);
                }}
              />
            </form>
          )}

          {error && <p className="account-row mt-2 text-xs text-blood">{error}</p>}
        </div>
      )}
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`account-row w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors disabled:opacity-50 ${
        primary
          ? "border-gold bg-gold/15 text-gold hover:bg-gold hover:text-abyss"
          : "border-edge/70 text-muted hover:border-gold/60 hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <label className="account-row block">
      <span className="block text-[10px] uppercase tracking-widest text-muted">{label}</span>
      <input
        {...rest}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-sm text-gold-bright outline-none focus:border-gold"
      />
    </label>
  );
}

function SubmitRow({
  busy,
  label,
  onBack,
}: {
  busy: boolean;
  label: string;
  onBack: () => void;
}) {
  return (
    <div className="account-row flex items-center gap-2 pt-1">
      <button
        type="submit"
        disabled={busy}
        className="flex-1 rounded-lg border border-gold bg-gold/15 py-1.5 text-xs text-gold transition-colors hover:bg-gold hover:text-abyss disabled:opacity-50"
      >
        {busy ? "..." : label}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="rounded-lg border border-edge/70 px-3 py-1.5 text-xs text-muted hover:border-gold/60 hover:text-gold"
      >
        back
      </button>
    </div>
  );
}
