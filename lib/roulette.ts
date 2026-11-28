/**
 * European roulette rules and wheel geometry. Pure functions only, shared by the browser and server.
 *
 * 37 pockets (0-36). Zero is green and loses even-money bets. A straight number pays 35 to 1,
 * while colour, parity and half bets pay 1 to 1. The single zero gives the house its 2.70% edge.
 */

export const ROULETTE_POCKETS = 37;

/** Wheel order, clockwise from the top-left pocket. Index maps directly to the SVG sector. */
export const ROULETTE_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const ROULETTE_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type RouletteColor = "green" | "red" | "black";

export const ROULETTE_COLORS: Record<RouletteColor, string> = {
  green: "#16834b",
  red: "#b92e36",
  black: "#20242d",
};

export function rouletteColor(n: number): RouletteColor {
  if (n === 0) return "green";
  return ROULETTE_RED.has(n) ? "red" : "black";
}

export const ROULETTE_BET_TYPES = ["number", "red", "black", "odd", "even", "low", "high"] as const;
export type RouletteBetType = (typeof ROULETTE_BET_TYPES)[number];

/** Total return multiple, including the returned stake. */
export const ROULETTE_MULTIPLIERS: Record<RouletteBetType, number> = {
  number: 36, // 35 to 1
  red: 2,
  black: 2,
  odd: 2,
  even: 2,
  low: 2,
  high: 2,
};

export const ROULETTE_BET_LABELS: Record<RouletteBetType, string> = {
  number: "Number (35 to 1)",
  red: "Red (1 to 1)",
  black: "Black (1 to 1)",
  odd: "Odd (1 to 1)",
  even: "Even (1 to 1)",
  low: "1-18 (1 to 1)",
  high: "19-36 (1 to 1)",
};

export function rouletteWins(betType: RouletteBetType, pick: number | null, number: number): boolean {
  if (number < 0 || number >= ROULETTE_POCKETS) return false;
  switch (betType) {
    case "number": return pick === number;
    case "red": case "black": return rouletteColor(number) === betType;
    case "odd": return number !== 0 && number % 2 === 1;
    case "even": return number !== 0 && number % 2 === 0;
    case "low": return number >= 1 && number <= 18;
    case "high": return number >= 19 && number <= 36;
  }
}

export const roulettePayout = (bet: number, betType: RouletteBetType) =>
  bet * ROULETTE_MULTIPLIERS[betType];

/** Largest stake whose total payout still fits under the table's maxWin. */
export const maxRouletteBet = (betType: RouletteBetType, maxWin: number) =>
  Math.floor(maxWin / ROULETTE_MULTIPLIERS[betType]);

/** Degrees the wheel must rotate to bring a pocket's centre under the top pointer. */
export function rotationForNumber(number: number, currentRotation: number): number {
  const index = ROULETTE_ORDER.indexOf(number as (typeof ROULETTE_ORDER)[number]);
  if (index < 0) return currentRotation;
  const step = 360 / ROULETTE_ORDER.length;
  const target = (360 - ((index + 0.5) * step) % 360) % 360;
  const current = ((currentRotation % 360) + 360) % 360;
  const alignment = (target - current + 360) % 360;
  return currentRotation + 360 * (6 + Math.floor(Math.random() * 3)) + alignment;
}
