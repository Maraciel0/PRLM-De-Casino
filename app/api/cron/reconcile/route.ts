import { db } from "@/lib/db";
import { transfers, audit } from "@/lib/db/schema";
import { and, eq, lt, sql } from "drizzle-orm";
import { route, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return fail(401, "Unauthorized");

  // Anything stuck > 2h gets flagged in the audit log for a human.
  const stale = await db.select().from(transfers).where(and(
    eq(transfers.status, "held"),
    lt(transfers.createdAt, sql`now() - interval '2 hours'`),
  )).limit(100);

  for (const t of stale) {
    await db.insert(audit).values({ operatorId: t.userId, action: "flag.stale_withdrawal", target: t.id, detail: { amount: t.amount } });
  }
  return json({ flagged: stale.length });
});
