import { db } from "@/lib/db";
import { transfers, users } from "@/lib/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { requireOperator } from "@/lib/auth";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireOperator();
  const rows = await db.select({
    id: transfers.id, amount: transfers.amount, refCode: transfers.refCode,
    status: transfers.status, createdAt: transfers.createdAt, handle: users.handle,
  }).from(transfers).innerJoin(users, eq(users.id, transfers.userId))
    .where(and(eq(transfers.direction, "withdraw"), inArray(transfers.status, ["held", "awaiting_operator"])))
    .orderBy(asc(transfers.createdAt)).limit(100);
  return json({ rows });
});
