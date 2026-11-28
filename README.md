# The House

A Parlamentum-gold casino. Manual treasury, operator queues, dice with a live house edge,
provably fair rolls, bankroll stop-loss.

## Deploy

1. `npm install`
2. Create Postgres (Vercel Postgres / Neon). Set `DATABASE_URL` to the POOLED string.
3. In Vercel env: `AUTH_SECRET`, `CSRF_SECRET`, `CRON_SECRET`, `OPERATOR_HANDLES`, `HOUSE_ACCOUNT`, `APP_URL`.
4. `npm run db:push` (or `npm run db:migrate`) then `npm run db:seed`
5. Deploy. The cron registers itself from `vercel.json`.

## Your first session

Set `OPERATOR_HANDLES` to your own handle, then link your account — you get the operator role.
Go to `/admin/settings` and set `bankroll` and `stopLossLiability` to your real numbers before
opening the tables. Default is 500 gold bankroll.

## Numbers that govern everything

- `houseEdgeBps` 300 = 3%. Dice payouts are derived from it; never edit that payout table by hand. Roulette uses standard European rules, so its built-in edge is 2.70%.
- `maxWin` caps a single payout. Per-game max bets are computed from it automatically.
- `stopLossLiability` auto-closes the tables when total player credit reaches it.

## Invariants

- Amounts are integers at 4 decimals.
- `applyDelta` is the only writer of balances; it locks the row and writes the ledger.
- Deposits credit only when an operator confirms. Withdrawals debit immediately and refund on reject.
- Every operator action writes to `audit`.

## Not built yet

- Games live: dice, memory (three difficulty tiers), blackjack and European roulette. Coin flip is next.
- The link handshake is trust-based (no profile scrape). Add one in `link/verify` when volume justifies it.
- Rate limiting is per-instance. Move to Upstash before you promote publicly.

## Blackjack

Table rules: 6 decks, dealer stands on all 17s, blackjack pays 3:2, double on any two cards, no split, insurance or surrender.
The shoe is shuffled from the player's server seed, client seed and nonce (see `lib/blackjack-server.ts`), and only the
first 52 cards are stored in `blackjack_rounds`. The browser never sees the shoe or the dealer's hole card until the hand ends.
After pulling this update run `npm run db:push` to create the `blackjack_rounds` table.
