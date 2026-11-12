import { db } from "@/lib/db";
import { users, wallets, rounds } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireUser, assertCsrf } from "@/lib/auth";
import { rollInput } from "@/lib/validation";
import { assertCanBet } from "@/lib/liability";
import { rollFloat } from "@/lib/fair";
import { multiplierBps, wins } from "@/lib/dice";
import { applyDelta } from "@/lib/wallet";
import { route, json, fail } from "@/lib/http";
import { limit } from "@/lib/rate-limit";

export const POST = route(async (req: Request) => {
  await assertCsrf(req);
  const u = await requireUser();
  if (!limit(`roll:${u.id}`, 60, 60_000)) return fail(429, "Slow down");

  const { bet, chanceBps, direction, idempotencyKey } = rollInput.parse(await req.json());
  const s = await assertCanBet();

  if (bet < s.minBet) return fail(400, `Minimum bet is ${s.minBet / 10_000}`);
  const mult = multiplierBps(chanceBps, s.houseEdgeBps);
  const maxWin = s.maxWin;
  if (Math.floor((bet * mult) / 10_000) > maxWin) return fail(400, "Bet exceeds the max win cap");

  const result = await db.transaction(async (tx) => {
    // Lock the player row so nonces cannot collide.
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

  return json({ ...result, serverSeedHash: result.round.serverSeedHash });
});