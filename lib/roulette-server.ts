import { sql } from "drizzle-orm";
import { db } from "./db";
import { rollFloat } from "./fair";
import { ROULETTE_POCKETS, rouletteColor, type RouletteBetType } from "./roulette";
import type { rouletteRounds } from "./db/schema";

/** One verifiable HMAC per spin, replayable from serverSeed + clientSeed + nonce. */
export function spinNumber(serverSeed: string, clientSeed: string, nonce: number): number {
  const f = rollFloat(serverSeed, `${clientSeed}:roulette`, nonce);
  return Math.min(ROULETTE_POCKETS - 1, Math.floor(f * ROULETTE_POCKETS));
}

type Row = typeof rouletteRounds.$inferSelect;

/** The shoe stays server-side; the browser only receives the settled pocket and payout. */
export function publicView(r: Row) {
  return {
    id: r.id,
    bet: r.bet,
    betType: r.betType as RouletteBetType,
    pick: r.pick,
    number: r.number,
    color: rouletteColor(r.number),
    won: r.won,
    payout: r.payout,
    nonce: r.nonce,
    clientSeed: r.clientSeed,
    serverSeedHash: r.serverSeedHash,
    createdAt: r.createdAt,
  };
}

let tableReady: Promise<void> | null = null;

/**
 * Creates the roulette table on first use, so the game works even if `db:push` was never run.
 * Safe to call on every request: it only touches the database once per server instance.
 */
export function ensureRouletteTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS roulette_rounds (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          bet bigint NOT NULL,
          bet_type text NOT NULL,
          pick integer,
          number integer NOT NULL,
          won boolean NOT NULL,
          payout bigint NOT NULL DEFAULT 0,
          nonce integer NOT NULL,
          client_seed text NOT NULL,
          server_seed_hash text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )`);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS roulette_user_idx ON roulette_rounds (user_id, created_at)`);
    })().catch((e) => {
      tableReady = null; // try again on the next request
      throw e;
    });
  }
  return tableReady;
}
