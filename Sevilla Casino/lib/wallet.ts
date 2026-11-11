import { eq, sql } from "drizzle-orm";
import type { Tx } from "./db";
import { wallets, ledger } from "./db/schema";
import { HttpError } from "./auth";

export async function applyDelta(tx: Tx, userId: string, delta: number, kind: string, ref?: string) {
  const [w] = await tx.select({ b: wallets.balance }).from(wallets)
    .where(eq(wallets.userId, userId)).for("update").limit(1);
  if (!w) throw new HttpError(404, "Wallet not found");
  const next = w.b + delta;
  if (next < 0) throw new HttpError(400, "Insufficient balance");
  await tx.update(wallets).set({ balance: next, updatedAt: sql`now()` }).where(eq(wallets.userId, userId));
  await tx.insert(ledger).values({ userId, delta, balanceAfter: next, kind, ref });
  return next;
}