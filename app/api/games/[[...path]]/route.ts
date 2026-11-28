import { db } from "@/lib/db";
import { users, wallets, rounds, memoryRounds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, assertCsrf } from "@/lib/auth";
import { rollInput, memoryGuessInput, memoryStartInput } from "@/lib/validation";
import { assertCanBet } from "@/lib/liability";
import { rollFloat } from "@/lib/fair";
import { multiplierBps, wins, table } from "@/lib/dice";
import {
  buildDeck, buildBacks, DIFFICULTIES, MEMORY_GUESSES, MEMORY_PAIRS,
  type Difficulty,
} from "@/lib/memory";
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
      games: [
        { slug: "dice", name: "Dice", live: true },
        { slug: "memory", name: "Memory", live: true },
        { slug: "blackjack", name: "Blackjack", live: true },
        { slug: "roulette", name: "Roulette", live: true },
      ],
      paused: s.paused,
    });
  }

  if (seg[0] === "dice" && seg.length === 1) {
    return json({ paused: s.paused, minBet: s.minBet, maxWin: s.maxWin, table: await table() });
  }

  if (seg[0] === "memory" && seg.length === 1) {
    return json({
      paused: s.paused,
      cards: MEMORY_PAIRS * 2,
      guesses: MEMORY_GUESSES,
      difficulties: Object.fromEntries(
        (Object.keys(DIFFICULTIES) as Difficulty[]).map((k) => [
          k,
          { cost: DIFFICULTIES[k].cost, reward: DIFFICULTIES[k].reward },
        ]),
      ),
    });
  }

  return fail(404, "Not found");
});

export const POST = route(async (req: Request, ctx: Ctx) => {
  const seg = (await ctx.params).path ?? [];
  await assertCsrf(req);
  const u = await requireUser();
  if (!u.linked) return fail(409, "Link your account first");
  if (!limit(`play:${u.id}`, 60, 60_000)) return fail(429, "Slow down");

  if (seg[0] === "dice" && seg[1] === "roll") {
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
  }

  if (seg[0] === "memory" && seg[1] === "start") {
    await assertCanBet();
    const { difficulty } = memoryStartInput.parse(await req.json().catch(() => ({})));
    const d = DIFFICULTIES[difficulty];

    const result = await db.transaction(async (tx) => {
      const [r] = await tx.insert(memoryRounds).values({
        userId: u.id,
        deck: buildDeck(),
        backs: buildBacks(),
        revealed: [],
        guessesLeft: MEMORY_GUESSES,
        difficulty,
      }).returning();
      await applyDelta(tx, u.id, -d.cost, "memory_stake", r.id);
      const [w] = await tx.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
      return { round: r, balance: w?.b ?? 0 };
    });

    return json(result);
  }

  if (seg[0] === "memory" && seg[1] === "guess") {
    const { roundId, a, b } = memoryGuessInput.parse(await req.json());
    if (a === b) return fail(400, "Pick two different cards");

    const out = await db.transaction(async (tx) => {
      const [r] = await tx.select().from(memoryRounds).where(eq(memoryRounds.id, roundId)).for("update").limit(1);
      if (!r || r.userId !== u.id) throw new Error("Round not found");
      if (r.status !== "active") throw new Error("Round already finished");

      const deck = r.deck as number[];
      const revealed = r.revealed as number[];
      if (a >= deck.length || b >= deck.length) throw new Error("Card out of range");
      if (revealed.includes(a) || revealed.includes(b)) throw new Error("Card already revealed");

      const reward = DIFFICULTIES[r.difficulty as Difficulty].reward;
      const matched = deck[a] === deck[b];
      const guessesLeft = r.guessesLeft - 1;
      const pairsFound = r.pairsFound + (matched ? 1 : 0);
      const payout = r.payout + (matched ? reward : 0);
      const nextRevealed = matched ? [...revealed, a, b] : revealed;

      let status = "active";
      if (pairsFound >= MEMORY_PAIRS) status = "won";
      else if (guessesLeft <= 0) status = "lost";

      await tx.update(memoryRounds)
        .set({ revealed: nextRevealed, guessesLeft, pairsFound, payout, status })
        .where(eq(memoryRounds.id, roundId));

      if (status !== "active" && payout > 0) {
        await applyDelta(tx, u.id, payout, "memory_win", roundId);
      }

      const [w] = await tx.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
      return {
        values: [deck[a], deck[b]] as [number, number],
        matched, pairsFound, guessesLeft, payout, status,
        balance: w?.b ?? 0,
      };
    });

    return json(out);
  }

  return fail(404, "Not found");
});
