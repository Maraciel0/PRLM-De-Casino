import { randomInt } from "node:crypto";
import { SCALE } from "./money";

export const MEMORY_CARDS = 10;
export const MEMORY_PAIRS = MEMORY_CARDS / 2;
export const MEMORY_GUESSES = Math.floor(MEMORY_PAIRS * 1.4);
export const MEMORY_COST = 20 * SCALE;
export const MEMORY_PAIR_REWARD = 6 * SCALE;
export const MEMORY_MAX_PAYOUT = MEMORY_PAIRS * MEMORY_PAIR_REWARD;
export const MEMORY_BREAKEVEN_PAIRS = Math.ceil(MEMORY_COST / MEMORY_PAIR_REWARD);

/** Pairs of values, shuffled. */
export function buildDeck(): number[] {
  const deck = Array.from({ length: MEMORY_CARDS }, (_, i) => Math.floor(i / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
