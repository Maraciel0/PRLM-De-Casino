import { db } from "./db";
import { wallets, transfers } from "./db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getSettings } from "./settings";
import { HttpError } from "./auth";

/** Gold actually on hand: confirmed deposits minus paid withdrawals. */
export async function getTreasury(): Promise<number> {
  const [d] = await db.select({ s: sql<number>`coalesce(sum(${transfers.amount}), 0)::bigint` })
    .from(transfers)
    .where(and(eq(transfers.direction, "deposit"), eq(transfers.status, "confirmed")));

  const [w] = await db.select({ s: sql<number>`coalesce(sum(${transfers.amount}), 0)::bigint` })
    .from(transfers)
    .where(and(eq(transfers.direction, "withdraw"), eq(transfers.status, "paid")));

  return Number(d?.s ?? 0) - Number(w?.s ?? 0);
}

/** Balances owed to players, plus withdrawals committed but not yet sent. */
export async function getLiability(): Promise<{ owed: number; held: number; total: number }> {
  const [w] = await db.select({ s: sql<number>`coalesce(sum(${wallets.balance}), 0)::bigint` }).from(wallets);
  const [h] = await db.select({ s: sql<number>`coalesce(sum(${transfers.amount}), 0)::bigint` })
    .from(transfers)
    .where(and(eq(transfers.direction, "withdraw"), inArray(transfers.status, ["held", "awaiting_operator"])));

  const owed = Number(w?.s ?? 0), held = Number(h?.s ?? 0);
  return { owed, held, total: owed + held };
}

/** House profit and loss. Positive means the house is ahead. */
export async function getPL(): Promise<number> {
  const [t, l] = await Promise.all([getTreasury(), getLiability()]);
  return t - l.total;
}

export async function assertCanBet() {
  const s = await getSettings();
  if (s.paused) throw new HttpError(423, "Tables are paused by the house");

  const [t, l] = await Promise.all([getTreasury(), getLiability()]);
  if (l.total - t > s.stopLossLiability) {
    throw new HttpError(423, "Stop-loss reached — tables paused");
  }
  return s;
}
