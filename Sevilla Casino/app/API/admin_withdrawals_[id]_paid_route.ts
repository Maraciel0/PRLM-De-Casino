import { db } from "@/lib/db";
import { transfers, audit } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireOperator, assertCsrf } from "@/lib/auth";
import { applyDelta } from "@/lib/wallet";
import { route, json, fail } from "@/lib/http";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await assertCsrf(req);
  const op = await requireOperator();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const [t] = await db.select().from(transfers).where(eq(transfers.id, id)).limit(1);
  if (!t || !["held", "awaiting_operator"].includes(t.status)) return fail(409, "Not pending");

  if (body.action === "reject") {
    await db.transaction(async (tx) => {
      await applyDelta(tx, t.userId, t.amount, "withdraw_refund", id);
      await tx.update(transfers).set({ status: "rejected", handledBy: op.id, updatedAt: new Date() }).where(eq(transfers.id, id));
    });
    await db.insert(audit).values({ operatorId: op.id, action: "withdraw.reject", target: id });
    return json({ ok: true });
  }

  await db.update(transfers).set({
    status: "paid", gameTxId: body.gameTxId ?? null, handledBy: op.id, updatedAt: new Date(),
  }).where(eq(transfers.id, id));
  await db.insert(audit).values({ operatorId: op.id, action: "withdraw.paid", target: id, detail: { amount: t.amount } });
  return json({ ok: true });
});