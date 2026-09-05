import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  smallint,
  integer,
  doublePrecision,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    displayName: text("display_name").notNull(),
    // Optional account layer: anonymous users have both columns null (SPEC §1.7).
    username: text("username"),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    isBanned: boolean("is_banned").notNull().default(false),
    lastIpHash: text("last_ip_hash"),
    renamedAt: timestamp("renamed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_username_idx").on(t.username)],
);

export type DraftAssignments = Partial<Record<"passive" | "q" | "w" | "e" | "r" | "model", string>>;

export const drafts = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  championIds: text("champion_ids").array().notNull(),
  assignments: jsonb("assignments").$type<DraftAssignments>().notNull().default({}),
  revealedCount: smallint("revealed_count").notNull().default(0),
  status: text("status").$type<"active" | "published" | "expired">().notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const creations = pgTable(
  "creations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .unique()
      .references(() => drafts.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    tagline: text("tagline"),
    modelId: text("model_id").notNull(),
    passiveId: text("passive_id").notNull(),
    qId: text("q_id").notNull(),
    wId: text("w_id").notNull(),
    eId: text("e_id").notNull(),
    rId: text("r_id").notNull(),
    patch: text("patch").notNull(),
    weekKey: text("week_key").notNull(),
    rating: integer("rating").notNull().default(1200),
    upvotes: integer("upvotes").notNull().default(0),
    battles: integer("battles").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    isHidden: boolean("is_hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("creations_new_idx").on(t.createdAt.desc()).where(sql`not ${t.isHidden}`),
    index("creations_week_idx").on(t.weekKey, t.isHidden),
    index("creations_rating_idx").on(t.rating).where(sql`not ${t.isHidden}`),
    check("creations_name_len", sql`char_length(${t.name}) between 1 and 24`),
  ],
);

export const upvotes = pgTable(
  "upvotes",
  {
    creationId: uuid("creation_id")
      .notNull()
      .references(() => creations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.creationId, t.userId] })],
);

export const battles = pgTable(
  "battles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aId: uuid("a_id")
      .notNull()
      .references(() => creations.id),
    bId: uuid("b_id")
      .notNull()
      .references(() => creations.id),
    winnerId: uuid("winner_id").references(() => creations.id),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => users.id),
    weekKey: text("week_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("battles_canonical_order", sql`${t.aId} < ${t.bId}`),
    uniqueIndex("battles_voter_week_pair_idx").on(t.voterId, t.aId, t.bId, t.weekKey),
    index("battles_week_idx").on(t.weekKey),
  ],
);

export const battleComments = pgTable(
  "battle_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    battlePair: text("battle_pair").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    isHidden: boolean("is_hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("battle_comments_pair_idx").on(t.battlePair, t.createdAt.desc())],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").$type<"creation" | "comment">().notNull(),
    targetId: uuid("target_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reports_unique_idx").on(t.targetType, t.targetId, t.userId)],
);

export const hallOfFame = pgTable(
  "hall_of_fame",
  {
    weekKey: text("week_key").notNull(),
    rank: smallint("rank").notNull(),
    creationId: uuid("creation_id")
      .notNull()
      .references(() => creations.id),
    wins: integer("wins").notNull(),
    losses: integer("losses").notNull(),
    score: doublePrecision("score").notNull(),
  },
  (t) => [primaryKey({ columns: [t.weekKey, t.rank] })],
);

export type Creation = typeof creations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Battle = typeof battles.$inferSelect;
