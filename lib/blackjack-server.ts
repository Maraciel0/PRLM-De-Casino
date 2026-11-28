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
