"use client";

import CreationPreview from "@/components/draft/CreationPreview";
import type { SlotKey } from "@/lib/champions";

export type PublishFormProps = {
  name: string;
  tagline: string;
  assignments: Partial<Record<SlotKey, string>>;
  publishing: boolean;
  error: string | null;
  onNameChange: (value: string) => void;
  onTaglineChange: (value: string) => void;
  onPublish: () => void;
};

export default function PublishForm({
  name,
  tagline,
  assignments,
  publishing,
  error,
  onNameChange,
  onTaglineChange,
  onPublish,
}: PublishFormProps) {
  return (
    <div className="mx-auto grid max-w-4xl items-start gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <CreationPreview name={name} tagline={tagline} assignments={assignments} />

      <div className="w-full">
        <h1 className="font-display text-3xl tracking-wide text-gold">NAME IT</h1>
        <p className="mt-1 text-xs text-muted">It already exists. Now it needs a name.</p>

        <label className="mt-6 block text-xs uppercase tracking-widest text-muted" htmlFor="creation-name">
          Name
        </label>
        <input
          id="creation-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={24}
          className="mt-1 w-full rounded-lg border border-edge bg-panel px-3 py-2.5 text-gold-bright outline-none focus:border-gold"
          placeholder="Yuumi"
        />

        <label className="mt-4 block text-xs uppercase tracking-widest text-muted" htmlFor="creation-tagline">
          Tagline <span className="normal-case text-muted/60">(optional, 140)</span>
        </label>
        <input
          id="creation-tagline"
          value={tagline}
          onChange={(e) => onTaglineChange(e.target.value)}
          maxLength={140}
          className="mt-1 w-full rounded-lg border border-edge bg-panel px-3 py-2.5 text-gold-bright outline-none focus:border-gold"
          placeholder="built to lose lane and win the game"
        />

        {error && <p className="mt-3 text-sm text-blood">{error}</p>}

        <button
          onClick={onPublish}
          disabled={publishing}
          className="mt-6 w-full rounded-lg border border-gold bg-gold/15 py-3.5 font-display text-xl tracking-wide text-gold transition-colors hover:bg-gold hover:text-abyss disabled:opacity-50"
        >
          {publishing ? "RELEASING..." : "RELEASE IT INTO THE WILD"}
        </button>
      </div>
    </div>
  );
}
