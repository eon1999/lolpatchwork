import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { drafts, type DraftAssignments } from "@/lib/db/schema";
import { CHAMPION_IDS, getChampion, SLOT_KEYS, type SlotKey } from "@/lib/champions";
import { ApiError } from "@/lib/api";
import { mirrorDraft } from "@/lib/ratelimit";

const DRAFT_TTL_MINUTES = 30;

/** Fisher–Yates over crypto.randomInt — nobody picks their deals (SPEC §2.5). */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealSix(): string[] {
  return shuffle(CHAMPION_IDS).slice(0, 6);
}

type DraftRow = typeof drafts.$inferSelect;

async function loadDraft(id: string, userId: string): Promise<DraftRow> {
  const rows = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1);
  const draft = rows[0];
  if (!draft || draft.userId !== userId) throw new ApiError("NOT_FOUND", "Draft not found.", 404);
  if (draft.status === "published") throw new ApiError("PUBLISHED", "Draft already published.", 409);
  if (draft.status === "expired" || draft.expiresAt.getTime() < Date.now()) {
    throw new ApiError("EXPIRED", "This draft expired.", 410);
  }
  return draft;
}

export async function startDraft(userId: string): Promise<string> {
  const inserted = await db
    .insert(drafts)
    .values({
      userId,
      championIds: dealSix(),
      assignments: {},
      revealedCount: 0,
      status: "active",
      expiresAt: new Date(Date.now() + DRAFT_TTL_MINUTES * 60_000),
    })
    .returning();
  const draft = inserted[0];
  await mirrorDraft(draft.id, { championIds: draft.championIds, assignments: {}, revealedCount: 0 });
  return draft.id;
}

/** Reveals exactly one champion, ever. AC: double-reveal without assign → 409. */
export async function revealNext(id: string, userId: string) {
  const draft = await loadDraft(id, userId);
  if (draft.revealedCount >= 6) {
    throw new ApiError("NO_MORE", "All six champions have been revealed.", 409);
  }
  if (Object.keys(draft.assignments).length !== draft.revealedCount) {
    throw new ApiError("ASSIGN_FIRST", "Assign the revealed champion before revealing again.", 409);
  }
  const index = draft.revealedCount;
  const championId = draft.championIds[index];
  const champion = getChampion(championId);
  if (!champion) throw new ApiError("DATA_ERROR", "Champion data missing.", 500);
  const updated = (
    await db
      .update(drafts)
      .set({ revealedCount: index + 1 })
      .where(eq(drafts.id, id))
      .returning()
  )[0];
  await mirrorDraft(id, {
    championIds: updated.championIds,
    assignments: updated.assignments,
    revealedCount: updated.revealedCount,
  });
  return { index, champion };
}

const ASSIGNABLE: readonly SlotKey[] = SLOT_KEYS;

export async function assignSlot(id: string, userId: string, slot: string) {
  if (!ASSIGNABLE.includes(slot as SlotKey)) {
    throw new ApiError("BAD_SLOT", "Unknown slot.", 400);
  }
  const draft = await loadDraft(id, userId);
  const assignments: DraftAssignments = draft.assignments;
  const assignedCount = Object.keys(assignments).length;
  if (assignedCount >= draft.revealedCount) {
    throw new ApiError("NOTHING_REVEALED", "No revealed champion waiting for assignment.", 409);
  }
  if (assignments[slot as SlotKey] !== undefined) {
    throw new ApiError("SLOT_FILLED", "That slot is already filled.", 409);
  }
  assignments[slot as SlotKey] = draft.championIds[draft.revealedCount - 1];
  const updated = (
    await db
      .update(drafts)
      .set({ assignments })
      .where(and(eq(drafts.id, id), eq(drafts.status, "active")))
      .returning()
  )[0];
  if (!updated) throw new ApiError("CONFLICT", "Draft state changed.", 409);
  await mirrorDraft(id, {
    championIds: updated.championIds,
    assignments: updated.assignments,
    revealedCount: updated.revealedCount,
  });
  return updated.assignments;
}

export async function getDraftState(id: string, userId: string) {
  const draft = await loadDraft(id, userId);
  return {
    id: draft.id,
    revealedCount: draft.revealedCount,
    assignedCount: Object.keys(draft.assignments).length,
    status: draft.status,
  };
}

export async function loadDraftForPublish(id: string, userId: string): Promise<DraftRow> {
  const draft = await loadDraft(id, userId);
  if (Object.keys(draft.assignments).length !== 6 || draft.revealedCount !== 6) {
    throw new ApiError("INCOMPLETE", "Assign all six slots before publishing.", 409);
  }
  return draft;
}
