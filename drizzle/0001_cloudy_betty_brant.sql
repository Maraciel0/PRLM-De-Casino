CREATE TABLE IF NOT EXISTS "roulette_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bet" bigint NOT NULL,
	"bet_type" text NOT NULL,
	"pick" integer,
	"number" integer NOT NULL,
	"won" boolean NOT NULL,
	"payout" bigint DEFAULT 0 NOT NULL,
	"nonce" integer NOT NULL,
	"client_seed" text NOT NULL,
	"server_seed_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roulette_rounds" ADD CONSTRAINT "roulette_rounds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roulette_user_idx" ON "roulette_rounds" USING btree ("user_id","created_at");