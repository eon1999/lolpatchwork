import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, upvotes, users } from "@/lib/db/schema";
import { toCard } from "@/lib/creations";
import { getUser } from "@/lib/user";
import { ChampionCardFull } from "@/components/ChampionCard";
import { UpvoteButton, ReportButton } from "@/components/Interactions";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const rows = await db
    .select({ creation: creations, authorName: users.displayName })
    .from(creations)
    .innerJoin(users, eq(users.id, creations.userId))
    .where(eq(creations.id, id))
    .limit(1);
  const row = rows[0];
  if (!row || row.creation.isHidden) return null;
  return row;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await load(id).catch(() => null);
  if (!row) return { title: "Not found" };
  const card = toCard(row.creation, row.authorName);
  return {
    title: card.name,
    description:
      card.tagline ??
      `${card.model.championName}'s body with ${card.slots.q?.abilityName}, ${card.slots.w?.abilityName}, ${card.slots.e?.abilityName} and ${card.slots.r?.abilityName}. Built by ${card.authorName}.`,
    openGraph: { images: [`/c/${id}/opengraph-image`] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CreationPage({ params }: Props) {
  const { id } = await params;
  const row = await load(id);
  if (!row) notFound();

  const card = toCard(row.creation, row.authorName);
  const viewer = await getUser().catch(() => null);
  let viewerUpvoted = false;
  if (viewer) {
    const uv = await db
      .select()
      .from(upvotes)
      .where(and(eq(upvotes.creationId, id), eq(upvotes.userId, viewer.id)))
      .limit(1);
    viewerUpvoted = uv.length > 0;
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/gallery" className="text-sm text-muted hover:text-gold">
          ← gallery
        </Link>
        <div className="flex items-center gap-3">
          <UpvoteButton
            creationId={card.id}
            initialCount={card.upvotes}
            initialUpvoted={viewerUpvoted}
          />
          <ReportButton creationId={card.id} />
        </div>
      </div>
      <ChampionCardFull card={card} />
    </div>
  );
}
