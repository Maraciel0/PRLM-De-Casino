import { db } from "@/lib/db";
import { users, wallets, blackjackRounds } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, assertCsrf, HttpError } from "@/lib/auth";
import { blackjackStartInput, blackjackActInput } from "@/lib/validation";
import { assertCanBet } from "@/lib/liability";
import { getSettings } from "@/lib/settings";
import { applyDelta } from "@/lib/wallet";
import { formatAmount } from "@/lib/money";
import { route, json, fail } from "@/lib/http";
import { limit } from "@/lib/rate-limit";
import {
  handValue, isBlackjack, outcome, naturalPayout, maxBetFor, canAffordDouble, type BjResult,
} from "@/lib/blackjack";
import { buildShoe, publicView } from "@/lib/blackjack-server";

type Ctx = { params: Promise<{ action: string }> };
export const dynamic = "force-dynamic";

export const POST = route(async (req: Request, ctx: Ctx) => {
  const { action } = await ctx.params;
  await assertCsrf(req);
  const u = await requireUser();
  if (!u.linked) return fail(409, "Link your account first");
  if (!limit(`play:${u.id}`, 60, 60_000)) return fail(429, "Slow down");

  // ---------- Deal ----------
  if (action === "start") {
    const { bet } = blackjackStartInput.parse(await req.json());
    const s = await assertCanBet();
    if (bet < s.minBet) return fail(400, `Minimum bet is ${formatAmount(s.minBet)}`);
    const maxBet = Math.min(maxBetFor(s.maxWin), s.maxWin);
    if (bet > maxBet) return fail(400, `Maximum bet is ${formatAmount(maxBet)}`);

    const out = await db.transaction(async (tx) => {
      // Locking the user row serialises deals, so a player can never open two hands at once.
      const [me] = await tx.select({
        seed: users.serverSeed, hash: users.serverSeedHash, client: users.clientSeed, nonce: users.nonce,
      }).from(users).where(eq(users.id, u.id)).for("update").limit(1);
      if (!me) throw new HttpError(404, "No user");

      const [open] = await tx.select({ id: blackjackRounds.id }).from(blackjackRounds)
        .where(and(eq(blackjackRounds.userId, u.id), eq(blackjackRounds.status, "active"))).limit(1);
      if (open) throw new HttpError(409, "Finish your current hand first");

      const nonce = me.nonce + 1;
      const clientSeed = me.client || "player";
      const shoe = buildShoe(me.seed, clientSeed, nonce);
      await tx.update(users).set({ nonce }).where(eq(users.id, u.id));

      // Deal order: player, dealer, player, dealer.
      const player = [shoe[0], shoe[2]];
      const dealer = [shoe[1], shoe[3]];

      const [row] = await tx.insert(blackjackRounds).values({
        userId: u.id, shoe, next: 4, player, dealer, bet, nonce, clientSeed, serverSeedHash: me.hash,
      }).returning();
      await applyDelta(tx, u.id, -bet, "bj_stake", row.id);

      let final = row;
      const pBJ = isBlackjack(player);
      const dBJ = isBlackjack(dealer);
      if (pBJ || dBJ) {
        let result: BjResult = "lose";
        let payout = 0;
        if (pBJ && dBJ) { result = "push"; payout = bet; }
        else if (pBJ) { result = "blackjack"; payout = naturalPayout(bet); }
        [final] = await tx.update(blackjackRounds)
          .set({ status: "settled", result, payout })
          .where(eq(blackjackRounds.id, row.id)).returning();
        if (payout > 0) await applyDelta(tx, u.id, payout, "bj_win", row.id);
      }

      const [w] = await tx.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
      return publicView(final, w?.b ?? 0, s.maxWin);
    });

    return json({ round: out });
  }

  // ---------- Hit / stand / double ----------
  if (action === "act") {
    const { roundId, action: move } = blackjackActInput.parse(await req.json());
    const s = await getSettings();

    const out = await db.transaction(async (tx) => {
      const [r] = await tx.select().from(blackjackRounds)
        .where(eq(blackjackRounds.id, roundId)).for("update").limit(1);
      if (!r || r.userId !== u.id) throw new HttpError(404, "Round not found");
      if (r.status !== "active") throw new HttpError(409, "This hand is already finished");

      const shoe = r.shoe as number[];
      const player = [...(r.player as number[])];
      const dealer = [...(r.dealer as number[])];
      let next = r.next;
      let doubled = r.doubled;
      const draw = () => {
        const c = shoe[next];
        if (c === undefined) throw new HttpError(500, "Shoe exhausted");
        next++;
        return c;
      };

      let finished = false;
      if (move === "hit") {
        player.push(draw());
        if (handValue(player).total >= 21) finished = true; // bust, or 21 stands automatically
      } else if (move === "double") {
        if (player.length !== 2 || doubled) throw new HttpError(400, "You can only double on your first two cards");
        if (!canAffordDouble(r.bet, s.maxWin)) throw new HttpError(400, "Bet is too large to double");
        await applyDelta(tx, u.id, -r.bet, "bj_double", r.id);
        doubled = true;
        player.push(draw());
        finished = true;
      } else {
        finished = true; // stand
      }

      let updated: typeof blackjackRounds.$inferSelect;
      if (!finished) {
        [updated] = await tx.update(blackjackRounds).set({ player, next })
          .where(eq(blackjackRounds.id, r.id)).returning();
      } else {
        const stake = doubled ? r.bet * 2 : r.bet;
        // The dealer only plays if the player is still in. Dealer stands on all 17s.
        if (handValue(player).total <= 21) {
          while (handValue(dealer).total < 17) dealer.push(draw());
        }
        const { result, payout } = outcome(player, dealer, stake);
        [updated] = await tx.update(blackjackRounds)
          .set({ player, dealer, next, doubled, status: "settled", result, payout })
          .where(eq(blackjackRounds.id, r.id)).returning();
        if (payout > 0) await applyDelta(tx, u.id, payout, "bj_win", r.id);
      }

      const [w] = await tx.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
      return publicView(updated, w?.b ?? 0, s.maxWin);
    });

    return json({ round: out });
  }

  return fail(404, "Not found");
});
