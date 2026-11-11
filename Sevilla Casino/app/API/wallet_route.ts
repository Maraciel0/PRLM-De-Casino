import { db } from "@/lib/db";
import { wallets, ledger, transfers } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const u = await requireUser();
  const [w] = await db.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
  const entries = await db.select().from(ledger).where(eq(ledger.userId, u.id)).orderBy(desc(ledger.createdAt)).limit(40);
  const moves = await db.select().from(transfers).where(eq(transfers.userId, u.id)).orderBy(desc(transfers.createdAt)).limit(20);
  return json({ balance: w?.b ?? 0, entries, transfers: moves });
});