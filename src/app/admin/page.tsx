"use client";

import { useCallback, useEffect, useState } from "react";

type ReportedCreation = {
  id: string;
  name: string;
  author: string;
  report_count: number;
  is_hidden: boolean;
  created_at: string;
};
type ReportedComment = {
  id: string;
  body: string;
  author: string;
  report_count: number;
  is_hidden: boolean;
  created_at: string;
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [creations, setCreations] = useState<ReportedCreation[]>([]);
  const [comments, setComments] = useState<ReportedComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("admin_token") ?? "");
  }, []);

  const load = useCallback(async (t: string) => {
    setError(null);
    const res = await fetch("/api/admin/reports", {
      headers: { authorization: `Bearer ${t}` },
    });
    const json = await res.json();
    if (json.ok) {
      setCreations(json.data.reportedCreations);
      setComments(json.data.reportedComments);
      setLoaded(true);
    } else {
      setError(json.error?.message ?? "Load failed.");
    }
  }, []);

  async function act(action: string, targetType: string | undefined, targetId: string) {
    await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, targetType, targetId }),
    });
    await load(token);
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="font-display text-3xl tracking-wide text-gold-bright">ADMIN</h1>
      <div className="mt-4 flex gap-2">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ADMIN_TOKEN"
          className="flex-1 rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-gold-bright outline-none focus:border-gold"
        />
        <button
          onClick={() => {
            localStorage.setItem("admin_token", token);
            void load(token);
          }}
          className="rounded-lg border border-gold bg-gold/15 px-4 py-2 text-sm text-gold hover:bg-gold hover:text-abyss"
        >
          open
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-blood">{error}</p>}

      {loaded && (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="font-display text-lg tracking-wide text-gold">REPORTED CREATIONS</h2>
            <ul className="mt-2 divide-y divide-edge/40">
              {creations.length === 0 && <li className="py-2 text-xs text-muted">nothing reported</li>}
              {creations.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <a href={`/c/${c.id}`} className="truncate font-semibold text-gold-bright hover:text-gold">
                      {c.name}
                    </a>
                    <span className="ml-2 text-xs text-muted">
                      by {c.author} · {c.report_count} reports {c.is_hidden && "· HIDDEN"}
                    </span>
                  </div>
                  <button
                    onClick={() => act(c.is_hidden ? "unhide" : "hide", "creation", c.id)}
                    className="shrink-0 rounded border border-edge px-3 py-1 text-xs text-muted hover:border-gold hover:text-gold"
                  >
                    {c.is_hidden ? "unhide" : "hide"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-lg tracking-wide text-gold">REPORTED COMMENTS</h2>
            <ul className="mt-2 divide-y divide-edge/40">
              {comments.length === 0 && <li className="py-2 text-xs text-muted">nothing reported</li>}
              {comments.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <span className="truncate text-gold-bright">{c.body}</span>
                    <span className="ml-2 text-xs text-muted">
                      by {c.author} · {c.report_count} reports {c.is_hidden && "· HIDDEN"}
                    </span>
                  </div>
                  <button
                    onClick={() => act(c.is_hidden ? "unhide" : "hide", "comment", c.id)}
                    className="shrink-0 rounded border border-edge px-3 py-1 text-xs text-muted hover:border-gold hover:text-gold"
                  >
                    {c.is_hidden ? "unhide" : "hide"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-lg tracking-wide text-gold">BAN BY USER ID</h2>
            <BanForm onAct={act} />
          </section>
        </div>
      )}
    </div>
  );
}

function BanForm({ onAct }: { onAct: (action: string, t: undefined, id: string) => Promise<void> }) {
  const [uid, setUid] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input
        value={uid}
        onChange={(e) => setUid(e.target.value)}
        placeholder="user uuid"
        className="flex-1 rounded border border-edge bg-panel px-3 py-2 text-xs text-gold-bright outline-none focus:border-gold"
      />
      <button
        onClick={() => void onAct("ban", undefined, uid)}
        className="rounded border border-blood/70 px-3 py-2 text-xs text-red-300 hover:bg-blood/20"
      >
        ban
      </button>
    </div>
  );
}
