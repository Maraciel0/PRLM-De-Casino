import { db } from "@/lib/db";
import { transfers, wallets } from "@/lib/db/schema";
import { and, count, eq, inArray } from "drizzle-orm";
import { requireUser, assertCsrf } from "@/lib/auth";
import { withdrawInput } from "@/lib/validation";
import { applyDelta } from "@/lib/wallet";
import { getSettings } from "@/lib/settings";
import { refCode } from "@/lib/ref";
import { route, json, fail } from "@/lib/http";
import { limit } from "@/lib/rate-limit";

export const POST = route(async (req: Request) => {
  await assertCsrf(req);
  const u = await requireUser();
  if (!u.linked) return fail(409, "Link your account first");
  if (!limit(`wdr:${u.id}`, 10, 60_000)) return fail(429, "Slow down");

  const { amount, idempotencyKey } = withdrawInput.parse(await req.json());
  const s = await getSettings();

  const [dup] = await db.select().from(transfers).where(eq(transfers.idempotencyKey, idempotencyKey)).limit(1);
  if (dup) return json({ transfer: dup, replay: true });

  const [open] = await db.select({ c: count() }).from(transfers)
    .where(and(eq(transfers.userId, u.id), eq(transfers.direction, "withdraw"),
      inArray(transfers.status, ["held", "awaiting_operator"])));
  if (Number(open.c) >= s.maxPendingWithdrawals) return fail(429, "Too many withdrawals pending");

  const [bal] = await db.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
  if (!bal || bal.b < amount) return fail(400, "Insufficient balance");

  const t = await db.transaction(async (tx) => {
    const [row] = await tx.insert(transfers).values({
      userId: u.id, direction: "withdraw", amount, status: "held",
      refCode: refCode("WDR"), idempotencyKey,
    }).returning();
    await applyDelta(tx, u.id, -amount, "withdraw_hold", row.id);
    return row;
  });

  return json({ transfer: t });
});
