import { db } from "@/lib/db";
import { users, wallets, rouletteRounds } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getUser, requireUser, assertCsrf, HttpError } from "@/lib/auth";
import { rouletteSpinInput } from "@/lib/validation";
import { assertCanBet } from "@/lib/liability";
import { getSettings } from "@/lib/settings";
import { applyDelta } from "@/lib/wallet";
import { formatAmount } from "@/lib/money";
import { route, json, fail } from "@/lib/http";
import { limit } from "@/lib/rate-limit";
import {
  ROULETTE_BET_LABELS, ROULETTE_BET_TYPES, ROULETTE_MULTIPLIERS,
  maxRouletteBet, roulettePayout, rouletteWins, type RouletteBetType,
} from "@/lib/roulette";
import { ensureRouletteTable, publicView, spinNumber } from "@/lib/roulette-server";

export const dynamic = "force-dynamic";

/** Table limits, bet types and the signed-in player's recent spins. */
export const GET = route(async () => {
  await ensureRouletteTable();
  const s = await getSettings();
  const u = await getUser();

  const history: ReturnType<typeof publicView>[] = [];
  if (u) {
    const rows = await db.select().from(rouletteRounds)
      .where(eq(rouletteRounds.userId, u.id))
      .orderBy(desc(rouletteRounds.createdAt)).limit(20);
    history.push(...rows.map(publicView));
  }

  return json({
    paused: s.paused,
    minBet: s.minBet,
    maxWin: s.maxWin,
    limits: Object.fromEntries(ROULETTE_BET_TYPES.map((t) => [
      t,
      {
        label: ROULETTE_BET_LABELS[t],
        multiplier: ROULETTE_MULTIPLIERS[t],
        maxBet: maxRouletteBet(t, s.maxWin),
      },
    ])) as Record<RouletteBetType, { label: string; multiplier: number; maxBet: number }>,
    history,
  });
});

export const POST = route(async (req: Request) => {
  await ensureRouletteTable();
  await assertCsrf(req);
  const u = await requireUser();
  if (!u.linked) return fail(409, "Link your account first");
  if (!limit(`play:${u.id}`, 60, 60_000)) return fail(429, "Slow down");

  const { bet, betType, pick } = rouletteSpinInput.parse(await req.json());
  const s = await assertCanBet();
  if (bet < s.minBet) return fail(400, `Minimum bet is ${formatAmount(s.minBet)}`);
  const maxBet = maxRouletteBet(betType, s.maxWin);
  if (bet > maxBet) return fail(400, `Maximum bet is ${formatAmount(maxBet)}`);

  const selected = betType === "number" ? pick ?? null : null;
  const out = await db.transaction(async (tx) => {
    const [me] = await tx.select({
      seed: users.serverSeed, hash: users.serverSeedHash, client: users.clientSeed, nonce: users.nonce,
    }).from(users).where(eq(users.id, u.id)).for("update").limit(1);
    if (!me) throw new HttpError(404, "No user");

    const nonce = me.nonce + 1;
    const clientSeed = me.client || "player";
    const number = spinNumber(me.seed, clientSeed, nonce);
    const won = rouletteWins(betType, selected, number);
    const payout = won ? roulettePayout(bet, betType) : 0;

    await tx.update(users).set({ nonce }).where(eq(users.id, u.id));
    const [row] = await tx.insert(rouletteRounds).values({
      userId: u.id, bet, betType, pick: selected, number, won, payout,
      nonce, clientSeed, serverSeedHash: me.hash,
    }).returning();

    await applyDelta(tx, u.id, -bet, "roulette_stake", row.id);
    if (payout > 0) await applyDelta(tx, u.id, payout, "roulette_win", row.id);

    const [w] = await tx.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
    return { round: { ...publicView(row), balance: w?.b ?? 0 }, balance: w?.b ?? 0 };
  });

  return json(out);
});
