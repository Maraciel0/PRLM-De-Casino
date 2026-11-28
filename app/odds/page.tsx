import {
  MEMORY_CARDS, MEMORY_PAIRS, MEMORY_GUESSES,
  DIFFICULTIES, maxPayout, breakevenPairs, type Difficulty,
} from "@/lib/memory";
import { formatAmount } from "@/lib/money";
import { BJ_DECKS } from "@/lib/blackjack";

export default function Odds() {
  const tiers: Difficulty[] = ["easy", "normal", "hard"];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">Odds &amp; rules</h1>

      <div className="card space-y-2">
        <h2 className="font-medium">Memory</h2>
        <p className="text-sm text-neutral-400">
          {MEMORY_CARDS} cards, {MEMORY_PAIRS} pairs. The board is shown briefly, flipped face-down, then shuffled
          before you may guess. Every matched pair pays immediately and stays revealed. A wrong pair flips back and
          costs a guess. When the guesses run out the round ends and pairs already matched are still paid.
        </p>
        <p className="text-xs text-neutral-500">
          Payout per pair scales with the entry cost, so the return is identical across tiers. Higher tiers cost
          more, move faster, and on Hard the cards gather, fan out and swap their backs before play begins.
        </p>
      </div>

      {tiers.map((d) => {
        const t = DIFFICULTIES[d];
        return (
          <div key={d} className="card space-y-2">
            <h2 className="font-medium">{t.label}</h2>
            <ul className="space-y-1 text-sm text-neutral-400">
              <li>Cost per round: {formatAmount(t.cost)} gold.</li>
              <li>Reward per matched pair: {formatAmount(t.reward)} gold.</li>
              <li>Guesses allowed: {MEMORY_GUESSES}.</li>
              <li>Maximum return: {formatAmount(maxPayout(d))} gold.</li>
              <li>Pairs needed to break even: {breakevenPairs(d)} of {MEMORY_PAIRS}.</li>
            </ul>
          </div>
        );
      })}

      <div className="card space-y-2">
        <h2 className="font-medium">Blackjack</h2>
        <ul className="space-y-1 text-sm text-neutral-400">
          <li>{BJ_DECKS} decks, shuffled fresh for every hand.</li>
          <li>Closest to 21 without going over beats the dealer. Aces count 11 or 1, face cards 10.</li>
          <li>Blackjack (an ace and a ten-value card) pays 3 to 2.</li>
          <li>The dealer checks for blackjack first, then draws to 16 and stands on every 17, soft 17 included.</li>
          <li>You may hit, stand, or double down on your first two cards (one card only, stake doubled).</li>
          <li>No splitting, no insurance, no surrender. A push returns your bet.</li>
        </ul>
        <p className="text-xs text-neutral-500">
          Every shuffle comes from your server seed, client seed and nonce, the same as the dice, so a hand can be
          replayed and checked once the seed is revealed. Large bets are capped so the biggest possible payout stays
          under the house max win.
        </p>
      </div>

      <p className="text-xs text-neutral-600">
        All games pay slightly under true odds. That margin is what keeps the house solvent and able to pay withdrawals.
      </p>
    </div>
  );
}
