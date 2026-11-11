import { getSettings } from "./settings";

export const CHANCES_BPS = [200, 500, 1000, 2000, 2500, 3300, 5000, 6600, 7500, 8000, 9000, 9500];

export type Direction = "under" | "over";

/** multiplier = (1 - edge) / chance, in basis points. */
export function multiplierBps(chanceBps: number, edgeBps: number): number {
  return Math.floor(((10_000 - edgeBps) * 10_000) / chanceBps);
}

/** Largest bet whose win still fits under maxWin. */
export function maxBetFor(chanceBps: number, edgeBps: number, maxWin: number): number {
  return Math.floor((maxWin * 10_000) / multiplierBps(chanceBps, edgeBps));
}

export async function table() {
  const s = await getSettings();
  return CHANCES_BPS.map((chanceBps) => {
    const mult = multiplierBps(chanceBps, s.houseEdgeBps);
    return {
      chanceBps,
      multiplierBps: mult,
      maxBet: Math.min(maxBetFor(chanceBps, s.houseEdgeBps, s.maxWin), s.maxWin),
      edgeBps: s.houseEdgeBps,
    };
  });
}

export function wins(rollBps: number, chanceBps: number, dir: Direction): boolean {
  return dir === "under" ? rollBps < chanceBps : rollBps >= 10_000 - chanceBps;
}