import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations } from "@/lib/db/schema";
import { toCard, type CreationCard } from "@/lib/creations";
import { getUser } from "@/lib/user";
import MyCreationCard from "@/components/MyCreationCard";
import AccountPrompt from "@/components/AccountPrompt";

export const metadata: Metadata = { title: "My Creations" };

const PAGE_SIZE = 12;

type Props = { searchParams: Promise<{ page?: string }> };

export default async function MinePage({ searchParams }: Props) {
  const { page: rawPage } = await searchParams;
  const parsed = Math.floor(Number(rawPage));
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  const user = await getUser().catch(() => null);

  let total = 0;
  let cards: CreationCard[] = [];
  if (user) {
    const mine = and(eq(creations.userId, user.id), eq(creations.isHidden, false));
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(creations)
      .where(mine);
    total = countRow?.count ?? 0;
    const rows = await db
      .select()
      .from(creations)
      .where(mine)
      .orderBy(desc(creations.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    cards = rows.map((row) => toCard(row, user.displayName));
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="py-8">
      <h1 className="font-display text-3xl tracking-wide text-gold-bright">MY CREATIONS</h1>
      <p className="mt-1 text-xs text-muted">
        {total > 0
          ? `${total} creation${total === 1 ? "" : "s"} in your inventory`
          : "the cards you've stitched and released"}
      </p>

      {(!user || !user.username) && <AccountPrompt creations={total} />}

      <div className="mt-6">
        {cards.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {cards.map((card) => (
              <MyCreationCard key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <EmptyState hasSession={Boolean(user)} />
        )}
      </div>

      {pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-between text-xs text-muted">
          {page > 1 ? (
            <Link href={`/mine?page=${page - 1}`} className="hover:text-gold">
              ← newer
            </Link>
          ) : (
            <span />
          )}
          <span>
            page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={`/mine?page=${page + 1}`} className="hover:text-gold">
              older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function EmptyState({ hasSession }: { hasSession: boolean }) {
  return (
    <div className="rounded-xl border border-edge/70 bg-panel px-6 py-12 text-center">
      <p className="font-display text-lg tracking-wide text-gold-bright">Nothing here yet.</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">
        Draft six champions, stitch them into one card and release it — it&apos;ll show up here with
        its upvotes, record and elo.
        {!hasSession && " Cards made as a guest only last the session, so make an account if you want to keep them."}
      </p>
      <Link
        href="/draft"
        className="mt-5 inline-block rounded-lg border border-gold bg-gold/15 px-5 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-abyss"
      >
        start a draft
      </Link>
    </div>
  );
}
