import { randomInt } from "node:crypto";
import { SCALE } from "./money";

export type Difficulty = "easy" | "normal" | "hard";

export const MEMORY_CARDS = 10;
export const MEMORY_PAIRS = MEMORY_CARDS / 2;
export const MEMORY_GUESSES = Math.floor(MEMORY_PAIRS * 1.4);
export const MEMORY_PAIR_REWARD = 6 * SCALE;
export const MEMORY_BREAKEVEN_PAIRS = Math.ceil(20 / 6);

export const DIFFICULTIES: Record<Difficulty, {
  label: string;
  cost: number;
  moveMs: number;
  swapsPerStep: number;
  stepMs: number;
  steps: number;
  gather: boolean;
  uniqueBacks: boolean;
}> = {
  easy: { label: "Easy", cost: 10 * SCALE, moveMs: 1100, swapsPerStep: 1, stepMs: 1300, steps: 12, gather: false, uniqueBacks: false },
  normal: { label: "Normal", cost: 20 * SCALE, moveMs: 900, swapsPerStep: 4, stepMs: 1000, steps: 8, gather: false, uniqueBacks: false },
  hard: { label: "Hard", cost: 30 * SCALE, moveMs: 500, swapsPerStep: 6, stepMs: 620, steps: 10, gather: true, uniqueBacks: true },
};

export const maxPayout = () => MEMORY_PAIRS * MEMORY_PAIR_REWARD;

export function buildDeck(): number[] {
  const deck = Array.from({ length: MEMORY_CARDS }, (_, i) => Math.floor(i / 2));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** One step: a set of disjoint index swaps. */
export function swapStep(slots: number[], count: number): number[] {
  const next = [...slots];
  const pool = next.map((_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let k = 0; k + 1 < pool.length && k / 2 < count; k += 2) {
    const a = pool[k], b = pool[k + 1];
    [next[a], next[b]] = [next[b], next[a]];
  }
  return next;
}
