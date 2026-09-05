"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChampionCardThumb } from "@/components/ChampionCard";
import type { CreationCard } from "@/lib/creations";

type FeedItem = CreationCard & { viewerUpvoted: boolean; weeklyUpvotes: number };

/** Overlapping cursor pages must not produce two cards with the same key. */
function dedupeById(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

const TABS = [
  { key: "new", label: "New" },
  { key: "week", label: "Top this week" },
] as const;

export default function GalleryFeed() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("new");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [empty, setEmpty] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  /**
   * A ref, not the `loading` state: the tab effect and the intersection observer
   * both fire on mount, and a state-based guard is still false in both closures,
   * so page one used to be fetched twice and appended to itself.
   */
  const inFlight = useRef(false);

  const loadMore = useCallback(
    async (reset: boolean, activeTab: string, currentCursor: string | null) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      try {
        const params = new URLSearchParams({ sort: activeTab, limit: "24" });
        if (currentCursor && !reset) params.set("cursor", currentCursor);
        const res = await fetch(`/api/creations?${params}`);
        const json = await res.json();
        if (json.ok) {
          const next = json.data.items as FeedItem[];
          setItems((prev) => (reset ? next : dedupeById([...prev, ...next])));
          setCursor(json.data.nextCursor);
          setDone(!json.data.nextCursor);
          setEmpty(reset && next.length === 0);
        }
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setDone(false);
    void loadMore(true, tab, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (done) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          void loadMore(false, tab, cursor);
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [done, loading, cursor, tab, loadMore]);

  return (
    <div>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              tab === t.key
                ? "border-gold bg-gold/15 text-gold"
                : "border-edge bg-panel text-muted hover:border-gold/50 hover:text-gold"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {empty ? (
        <p className="py-16 text-center text-sm text-muted">
          Nobody has built anything yet. Suspicious.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ChampionCardThumb key={item.id} card={item} />
          ))}
        </div>
      )}

      <div ref={sentinel} className="h-10" />
      {loading && <p className="py-4 text-center text-xs text-muted">loading more atrocities...</p>}
    </div>
  );
}
