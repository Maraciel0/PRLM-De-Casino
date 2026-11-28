import { sql } from "drizzle-orm";
import { db } from "./db";
import { rollFloat } from "./fair";
import { BJ_DECKS, canAffordDouble } from "./blackjack";
import type { blackjackRounds } from "./db/schema";

/**
 * Provably fair shoe. Every swap of the Fisher-Yates shuffle takes its random number from the same
 * HMAC the dice use, so once a server seed is revealed the player can replay the shuffle from
 * (serverSeed, clientSeed, nonce). Only the first 52 cards are stored; a hand cannot use that many.
 */
export function buildShoe(serverSeed: string, clientSeed: string, nonce: number): number[] {
  const cards = Array.from({ length: 52 * BJ_DECKS }, (_, i) => i % 52);
  for (let i = cards.length - 1; i > 0; i--) {
    const f = rollFloat(serverSeed, `${clientSeed}:bj:${nonce}`, i);
    const j = Math.floor(f * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards.slice(0, 52);
}

type Row = typeof blackjackRounds.$inferSelect;

/** What the browser is allowed to see: never the shoe, and never the hole card while the hand is live. */
export function publicView(r: Row, balance: number, maxWin: number) {
  const player = r.player as number[];
  const dealer = r.dealer as number[];
  const active = r.status === "active";
  return {
    id: r.id,
    bet: r.bet,
    doubled: r.doubled,
    status: r.status,
    result: r.result,
    payout: r.payout,
    player,
    dealer: active ? dealer.slice(0, 1) : dealer,
    holeHidden: active,
    canDouble: active && player.length === 2 && !r.doubled && canAffordDouble(r.bet, maxWin) && balance >= r.bet,
    balance,
  };
}

let tableReady: Promise<void> | null = null;

/**
 * Creates the blackjack table on first use, so the game works even if `db:push` was never run.
 * Safe to call on every request: it only touches the database once per server instance.
 */
export function ensureBlackjackTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS blackjack_rounds (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          shoe jsonb NOT NULL,
          next integer NOT NULL DEFAULT 4,
          player jsonb NOT NULL DEFAULT '[]'::jsonb,
          dealer jsonb NOT NULL DEFAULT '[]'::jsonb,
          bet bigint NOT NULL,
          doubled boolean NOT NULL DEFAULT false,
          status text NOT NULL DEFAULT 'active',
          result text,
          payout bigint NOT NULL DEFAULT 0,
          nonce integer NOT NULL,
          client_seed text NOT NULL,
          server_seed_hash text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )`);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS blackjack_user_idx ON blackjack_rounds (user_id, status, created_at)`);
    })().catch((e) => {
      tableReady = null; // try again on the next request
      throw e;
    });
  }
  return tableReady;
}
