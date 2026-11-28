DO $$ BEGIN CREATE TYPE "public"."direction" AS ENUM('deposit', 'withdraw'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."role" AS ENUM('player', 'operator'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."status" AS ENUM('awaiting_operator', 'held', 'paid', 'confirmed', 'rejected', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blackjack_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"shoe" jsonb NOT NULL,
	"next" integer DEFAULT 4 NOT NULL,
	"player" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dealer" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bet" bigint NOT NULL,
	"doubled" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"result" text,
	"payout" bigint DEFAULT 0 NOT NULL,
	"nonce" integer NOT NULL,
	"client_seed" text NOT NULL,
	"server_seed_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"delta" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"kind" text NOT NULL,
	"ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memory_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"deck" jsonb NOT NULL,
	"backs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revealed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"difficulty" text DEFAULT 'normal' NOT NULL,
	"guesses_left" integer NOT NULL,
	"pairs_found" integer DEFAULT 0 NOT NULL,
	"payout" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"phase" text DEFAULT 'play' NOT NULL,
	"steps_left" integer DEFAULT 0 NOT NULL,
	"moves_left" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game" text NOT NULL,
	"bet" bigint NOT NULL,
	"multiplier_bps" integer NOT NULL,
	"chance_bps" integer NOT NULL,
	"roll_bps" integer NOT NULL,
	"won" boolean NOT NULL,
	"payout" bigint NOT NULL,
	"nonce" integer NOT NULL,
	"client_seed" text NOT NULL,
	"server_seed_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"house_edge_bps" integer DEFAULT 300 NOT NULL,
	"min_bet" bigint DEFAULT 10000 NOT NULL,
	"max_win" bigint DEFAULT 1000000 NOT NULL,
	"max_pending_withdrawals" integer DEFAULT 3 NOT NULL,
	"bankroll" bigint DEFAULT 5000000 NOT NULL,
	"stop_loss_liability" bigint DEFAULT 4000000 NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"payout_sla_minutes" integer DEFAULT 30 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_text" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"direction" "direction" NOT NULL,
	"amount" bigint NOT NULL,
	"status" "status" NOT NULL,
	"ref_code" text NOT NULL,
	"game_tx_id" text,
	"idempotency_key" text NOT NULL,
	"operator_note" text,
	"handled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfers_ref_code_unique" UNIQUE("ref_code"),
	CONSTRAINT "transfers_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "role" DEFAULT 'player' NOT NULL,
	"handle" text,
	"password_hash" text,
	"profile_code" text,
	"link_code" text,
	"link_code_expires_at" timestamp with time zone,
	"linked_at" timestamp with time zone,
	"server_seed" text NOT NULL,
	"server_seed_hash" text NOT NULL,
	"client_seed" text DEFAULT '' NOT NULL,
	"nonce" integer DEFAULT 0 NOT NULL,
	"revealed_seeds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle"),
	CONSTRAINT "users_profile_code_unique" UNIQUE("profile_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit" ADD CONSTRAINT "audit_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blackjack_rounds" ADD CONSTRAINT "blackjack_rounds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger" ADD CONSTRAINT "ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memory_rounds" ADD CONSTRAINT "memory_rounds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rounds" ADD CONSTRAINT "rounds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfers" ADD CONSTRAINT "transfers_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blackjack_user_idx" ON "blackjack_rounds" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_user_idx" ON "ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memory_user_idx" ON "memory_rounds" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rounds_user_idx" ON "rounds" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_status_idx" ON "transfers" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_user_idx" ON "transfers" USING btree ("user_id","created_at");