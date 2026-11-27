import { randomInt } from "node:crypto";
import { SCALE } from "./money";

export type Difficulty = "easy" | "normal" | "hard";

export const MEMORY_CARDS = 10;
export const MEMORY_PAIRS = MEMORY_CARDS / 2;
export const MEMORY_GUESSES = Math.floor(MEMORY_CARDS * 1.4);

export const DIFFICULTIES: Record<
  Difficulty,
  {
    label: string;
    cost: number;
    reward: number;
    moveMs: number;
    swapsPerStep: number;
    stepMs: number;
    steps: number;
    gather: boolean;
    uniqueBacks: boolean;
  }
> = {
  easy: { label: "Easy", cost: 10 * SCALE, reward: 3 * SCALE, moveMs: 1100, swapsPerStep: 1, stepMs: 1300, steps: 14, gather: false, uniqueBacks: false },
  normal: { label: "Normal", cost: 20 * SCALE, reward: 6 * SCALE, moveMs: 900, swapsPerStep: 4, stepMs: 1000, steps: 8, gather: false, uniqueBacks: false },
  hard: { label: "Hard", cost: 30 * SCALE, reward: 9 * SCALE, moveMs: 500, swapsPerStep: 6, stepMs: 620, steps: 10, gather: true, uniqueBacks: true },
};

export const maxPayout = (d: Difficulty) => MEMORY_PAIRS * DIFFICULTIES[d].reward;

export const breakevenPairs = (d: Difficulty) =>
  Math.ceil(DIFFICULTIES[d].cost / DIFFICULTIES[d].reward);

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildDeck(): number[] {
  return shuffleInPlace(Array.from({ length: MEMORY_CARDS }, (_, i) => Math.floor(i / 2)));
}

export function buildBacks(): number[] {
  return shuffleInPlace(Array.from({ length: MEMORY_CARDS }, (_, i) => Math.floor(i / 2)));
}
