import { db } from "@/lib/db";
import { transfers, users, audit } from "@/lib/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { requireOperator, assertCsrf } from "@/lib/auth";
import { getLiability, getTreasury } from "@/lib/liability";
import { getSettings, updateSettings } from "@/lib/settings";
import { settingsInput } from "@/lib/validation";
import { applyDelta } from "@/lib/wallet";
import { route, json, fail } from "@/lib/http";

type Ctx = { params: Promise<{ path: string[] }> };
export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: Ctx) => {
  await requireOperator();
  const seg = (await ctx.params).path;

  if (seg[0] === "deposits") {
    const rows = await db.select({
      id: transfers.id, amount: transfers.amount, refCode: transfers.refCode,
      gameTxId: transfers.gameTxId, createdAt: transfers.createdAt, handle: users.handle,
    }).from(transfers).innerJoin(users, eq(users.id, transfers.userId))
      .where(and(eq(transfers.direction, "deposit"), eq(transfers.status, "awaiting_operator")))
      .orderBy(asc(transfers.createdAt)).limit(100);
    return json({ rows });
  }

  if (seg[0] === "withdrawals") {
    const rows = await db.select({
      id: transfers.id, amount: transfers.amount, refCode: transfers.refCode,
      status: transfers.status, createdAt: transfers.createdAt, handle: users.handle,
    }).from(transfers).innerJoin(users, eq(users.id, transfers.userId))
      .where(and(eq(transfers.direction, "withdraw"), inArray(transfers.status, ["held", "awaiting_operator"])))
      .orderBy(asc(transfers.createdAt)).limit(100);
    return json({ rows });
  }

  if (seg[0] === "settings") return json({ settings: await getSettings() });
  
  if (seg[0] === "announcements") return json({ rows: await getAllAnnouncements() });
  if (seg[0] === "content") return json({ text: await getSiteText() });
  
  if (seg[0] === "stats") {
    const [s, t, l] = await Promise.all([getSettings(), getTreasury(), getLiability()]);
    const profit = t - l.total;
    return json({
      treasury: t,
      owed: l.owed,
      held: l.held,
      profit,
      shortfall: Math.max(0, l.total - t),
      stopLoss: s.stopLossLiability,
      bankroll: s.bankroll,
      paused: s.paused,
    });
  }

  return fail(404, "Not found");
});

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  await assertCsrf(req);
  await requireOperator();
  const seg = (await ctx.params).path;
  if (seg[0] !== "settings") return fail(404, "Not found");
  await updateSettings(settingsInput.parse(await req.json()));
  return json({ settings: await getSettings() });
});

export const POST = route(async (req: Request, ctx: Ctx) => {
  await assertCsrf(req);
  const op = await requireOperator();
  const seg = (await ctx.params).path;
  const body = await req.json().catch(() => ({}));

  // deposits/:id/confirm
  if (seg[0] === "deposits" && seg[2] === "confirm") {
    const [t] = await db.select().from(transfers).where(eq(transfers.id, seg[1])).limit(1);
    if (!t || t.status !== "awaiting_operator") return fail(409, "Not pending");

    if (body.action === "reject") {
      await db.update(transfers).set({ status: "rejected", handledBy: op.id, updatedAt: new Date() }).where(eq(transfers.id, t.id));
      await db.insert(audit).values({ operatorId: op.id, action: "deposit.reject", target: t.id });
      return json({ ok: true });
    }

    await db.transaction(async (tx) => {
      await applyDelta(tx, t.userId, t.amount, "deposit", t.id);
      await tx.update(transfers).set({ status: "confirmed", handledBy: op.id, updatedAt: new Date() }).where(eq(transfers.id, t.id));
    });
    await db.insert(audit).values({ operatorId: op.id, action: "deposit.confirm", target: t.id, detail: { amount: t.amount } });
    return json({ ok: true });
  }

  // withdrawals/:id/paid
  if (seg[0] === "withdrawals" && seg[2] === "paid") {
    const [t] = await db.select().from(transfers).where(eq(transfers.id, seg[1])).limit(1);
    if (!t || !["held", "awaiting_operator"].includes(t.status)) return fail(409, "Not pending");

    if (body.action === "reject") {
      await db.transaction(async (tx) => {
        await applyDelta(tx, t.userId, t.amount, "withdraw_refund", t.id);
        await tx.update(transfers).set({ status: "rejected", handledBy: op.id, updatedAt: new Date() }).where(eq(transfers.id, t.id));
      });
      await db.insert(audit).values({ operatorId: op.id, action: "withdraw.reject", target: t.id });
      return json({ ok: true });
    }

    await db.update(transfers).set({
      status: "paid", gameTxId: body.gameTxId ?? null, handledBy: op.id, updatedAt: new Date(),
    }).where(eq(transfers.id, t.id));
    await db.insert(audit).values({ operatorId: op.id, action: "withdraw.paid", target: t.id, detail: { amount: t.amount } });
    return json({ ok: true });
  }

  return fail(404, "Not found");
});
