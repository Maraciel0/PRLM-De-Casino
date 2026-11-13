import { db } from "@/lib/db";
import { transfers, users } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { requireOperator } from "@/lib/auth";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireOperator();
  const rows = await db.select({
    id: transfers.id, amount: transfers.amount, refCode: transfers.refCode,
    gameTxId: transfers.gameTxId, createdAt: transfers.createdAt, handle: users.handle,
  }).from(transfers).innerJoin(users, eq(users.id, transfers.userId))
    .where(and(eq(transfers.direction, "deposit"), eq(transfers.status, "awaiting_operator")))
    .orderBy(asc(transfers.createdAt)).limit(100);
  return json({ rows });
});
