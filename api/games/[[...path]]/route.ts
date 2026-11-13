import { db } from "@/lib/db";
import { users, wallets, rounds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, assertCsrf } from "@/lib/auth";
import { rollInput } from "@/lib/validation";
import { assertCanBet } from "@/lib/liability";
import { rollFloat } from "@/lib/fair";
import { multiplierBps, wins, table } from "@/lib/dice";
import { getSettings } from "@/lib/settings";
import { applyDelta } from "@/lib/wallet";
import { route, json, fail } from "@/lib/http";
import { limit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ path?: string[] }> };
export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const seg = (await ctx.params).path ?? [];
  const s = await getSettings();

  if (seg.length === 0) {
    return json({
      games: [{ slug: "dice", name: "Dice", live: true, edgeBps: s.houseEdgeBps }],
      paused: s.paused, minBet: s.minBet, maxWin: s.maxWin, table: await table(),
    });
  }

  if (seg[0] === "dice" && seg.length === 1) {
    const u = await requireUser();
    const [me] = await db.select({ hash: users.serverSeedHash, client: users.clientSeed, nonce: users.nonce })
      .from(users).where(eq(users.id, u.id)).limit(1);
    return json({
      paused: s.paused, minBet: s.minBet, maxWin: s.maxWin, edgeBps: s.houseEdgeBps,
      table: await table(), seed: { hash: me?.hash, clientSeed: me?.client, nonce: me?.nonce },
    });
  }

  return fail(404, "Not found");
});

export const POST = route(async (req: Request, ctx: Ctx) => {
  const seg = (await ctx.params).path ?? [];
  if (!(seg[0] === "dice" && seg[1] === "roll")) return fail(404, "Not found");

  await assertCsrf(req);
  const u = await requireUser();
  if (!limit(`roll:${u.id}`, 60, 60_000)) return fail(429, "Slow down");

  const { bet, chanceBps, direction, idempotencyKey } = rollInput.parse(await req.json());
  const s = await assertCanBet();
  if (bet < s.minBet) return fail(400, `Minimum bet is ${s.minBet / 10_000}`);

  const mult = multiplierBps(chanceBps, s.houseEdgeBps);
  if (Math.floor((bet * mult) / 10_000) > s.maxWin) return fail(400, "Bet exceeds the max win cap");

  const result = await db.transaction(async (tx) => {
    const [me] = await tx.select({
      seed: users.serverSeed, hash: users.serverSeedHash, client: users.clientSeed, nonce: users.nonce,
    }).from(users).where(eq(users.id, u.id)).for("update").limit(1);
    if (!me) throw new Error("No user");

    const nonce = me.nonce + 1;
    const clientSeed = me.client || "player";
    const rollBps = Math.floor(rollFloat(me.seed, clientSeed, nonce) * 10_000);
    const won = wins(rollBps, chanceBps, direction);
    const payout = won ? Math.floor((bet * mult) / 10_000) : 0;

    await tx.update(users).set({ nonce }).where(eq(users.id, u.id));
    await applyDelta(tx, u.id, -bet, "bet", idempotencyKey);
    if (payout > 0) await applyDelta(tx, u.id, payout, "win", idempotencyKey);

    const [row] = await tx.insert(rounds).values({
      userId: u.id, game: "dice", bet, multiplierBps: mult, chanceBps,
      rollBps, won, payout, nonce, clientSeed, serverSeedHash: me.hash,
    }).returning();

    const [w] = await tx.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
    return { round: row, balance: w?.b ?? 0 };
  });

  return json(result);
});
