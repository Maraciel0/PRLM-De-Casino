/**
 * Blackjack rules and hand maths. Pure functions only, so the browser and the server share them.
 *
 * Table rules: 6 decks, dealer stands on all 17s, blackjack pays 3:2, double down on any first two
 * cards, no splitting, no insurance, no surrender. The dealer checks for blackjack before play.
 */

export const BJ_DECKS = 6;
export const BJ_BLACKJACK_NUM = 5; // payout = bet * 5 / 2 (stake back plus 3:2)
export const BJ_BLACKJACK_DEN = 2;

export type BjResult = "blackjack" | "win" | "lose" | "push" | "bust";

/** Card: 0..51. rank 0 = Ace, 1..9 = 2..10, 10 = J, 11 = Q, 12 = K. suit 0..3 = spades, hearts, diamonds, clubs. */
export const rankOf = (c: number) => c % 13;
export const suitOf = (c: number) => Math.floor(c / 13);

export const RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const SUIT_SYMBOLS = ["♠", "♥", "♦", "♣"];
export const isRed = (c: number) => suitOf(c) === 1 || suitOf(c) === 2;

export function cardPoints(c: number): number {
  const r = rankOf(c);
  if (r === 0) return 11;
  if (r >= 9) return 10;
  return r + 1;
}

export function handValue(cards: number[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardPoints(c);
    if (rankOf(c) === 0) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (cards: number[]) => cards.length === 2 && handValue(cards).total === 21;

/** Largest base bet. The biggest single payout is a natural at 2.5x, which must stay under maxWin. */
export const maxBetFor = (maxWin: number) => Math.floor((maxWin * BJ_BLACKJACK_DEN) / BJ_BLACKJACK_NUM);

/** Doubling pays 4x the base bet on a win, so it is only offered while that fits under maxWin. */
export const canAffordDouble = (bet: number, maxWin: number) => bet * 4 <= maxWin;

export function outcome(player: number[], dealer: number[], stake: number): { result: BjResult; payout: number } {
  const p = handValue(player).total;
  const d = handValue(dealer).total;
  if (p > 21) return { result: "bust", payout: 0 };
  if (d > 21) return { result: "win", payout: stake * 2 };
  if (p > d) return { result: "win", payout: stake * 2 };
  if (p === d) return { result: "push", payout: stake };
  return { result: "lose", payout: 0 };
}

export const naturalPayout = (bet: number) => Math.floor((bet * BJ_BLACKJACK_NUM) / BJ_BLACKJACK_DEN);
