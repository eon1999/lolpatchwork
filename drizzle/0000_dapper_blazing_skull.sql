CREATE TABLE "battle_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_pair" text NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"a_id" uuid NOT NULL,
	"b_id" uuid NOT NULL,
	"winner_id" uuid,
	"voter_id" uuid NOT NULL,
	"week_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "battles_canonical_order" CHECK ("battles"."a_id" < "battles"."b_id")
);
--> statement-breakpoint
CREATE TABLE "creations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"model_id" text NOT NULL,
	"passive_id" text NOT NULL,
	"q_id" text NOT NULL,
	"w_id" text NOT NULL,
	"e_id" text NOT NULL,
	"r_id" text NOT NULL,
	"patch" text NOT NULL,
	"week_key" text NOT NULL,
	"rating" integer DEFAULT 1200 NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"battles" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creations_draft_id_unique" UNIQUE("draft_id"),
	CONSTRAINT "creations_name_len" CHECK (char_length("creations"."name") between 1 and 24)
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"champion_ids" text[] NOT NULL,
	"assignments" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revealed_count" smallint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hall_of_fame" (
	"week_key" text NOT NULL,
	"rank" smallint NOT NULL,
	"creation_id" uuid NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	"score" double precision NOT NULL,
	CONSTRAINT "hall_of_fame_week_key_rank_pk" PRIMARY KEY("week_key","rank")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upvotes" (
	"creation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upvotes_creation_id_user_id_pk" PRIMARY KEY("creation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"username" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"last_ip_hash" text,
	"renamed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "battle_comments" ADD CONSTRAINT "battle_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_a_id_creations_id_fk" FOREIGN KEY ("a_id") REFERENCES "public"."creations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_b_id_creations_id_fk" FOREIGN KEY ("b_id") REFERENCES "public"."creations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_winner_id_creations_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."creations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creations" ADD CONSTRAINT "creations_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creations" ADD CONSTRAINT "creations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_of_fame" ADD CONSTRAINT "hall_of_fame_creation_id_creations_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_creation_id_creations_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battle_comments_pair_idx" ON "battle_comments" USING btree ("battle_pair","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "battles_voter_week_pair_idx" ON "battles" USING btree ("voter_id","a_id","b_id","week_key");--> statement-breakpoint
CREATE INDEX "battles_week_idx" ON "battles" USING btree ("week_key");--> statement-breakpoint
CREATE INDEX "creations_new_idx" ON "creations" USING btree ("created_at" DESC NULLS LAST) WHERE not "creations"."is_hidden";--> statement-breakpoint
CREATE INDEX "creations_week_idx" ON "creations" USING btree ("week_key","is_hidden");--> statement-breakpoint
CREATE INDEX "creations_rating_idx" ON "creations" USING btree ("rating") WHERE not "creations"."is_hidden";--> statement-breakpoint
CREATE UNIQUE INDEX "reports_unique_idx" ON "reports" USING btree ("target_type","target_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");