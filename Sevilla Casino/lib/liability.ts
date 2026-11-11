import { db } from "./db";
import { wallets, transfers } from "./db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getSettings } from "./settings";
import { HttpError } from "./auth";

/** Everything owed to players right now. */
export async function getLiability(): Promise<{ owed: number; held: number; total: number }> {
  const [w] = await db.select({ s: sql<number>`coalesce(sum(${wallets.balance}), 0)::bigint` }).from(wallets);
  const [h] = await db.select({ s: sql<number>`coalesce(sum(${transfers.amount}), 0)::bigint` })
    .from(transfers)
    .where(and(eq(transfers.direction, "withdraw"), inArray(transfers.status, ["held", "awaiting_operator"])));
  const owed = Number(w?.s ?? 0), held = Number(h?.s ?? 0);
  return { owed, held, total: owed + held };
}

export async function assertCanBet() {
  const s = await getSettings();
  if (s.paused) throw new HttpError(423, "Tables are paused by the house");
  const { total } = await getLiability();
  if (total >= s.stopLossLiability) throw new HttpError(423, "Stop-loss reached — tables paused");
  return s;
}