import {
  MEMORY_CARDS, MEMORY_PAIRS, MEMORY_GUESSES, MEMORY_COST,
  MEMORY_PAIR_REWARD, MEMORY_MAX_PAYOUT, MEMORY_BREAKEVEN_PAIRS,
} from "@/lib/memory";
import { formatAmount } from "@/lib/money";

export default function Odds() {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">Odds &amp; rules</h1>

      <div className="card space-y-2">
        <h2 className="font-medium">Memory</h2>
        <ul className="space-y-1 text-sm text-neutral-400">
          <li>Board: {MEMORY_CARDS} cards, {MEMORY_PAIRS} pairs.</li>
          <li>Cost per round: {formatAmount(MEMORY_COST)} gold.</li>
          <li>Reward per matched pair: {formatAmount(MEMORY_PAIR_REWARD)} gold.</li>
          <li>Guesses allowed: {MEMORY_GUESSES}.</li>
          <li>Maximum return: {formatAmount(MEMORY_MAX_PAYOUT)} gold.</li>
          <li>Pairs needed to break even: {MEMORY_BREAKEVEN_PAIRS}.</li>
        </ul>
        <p className="text-xs text-neutral-500">
          Every pair you match pays immediately and stays revealed. Unmatched pairs flip back and cost a guess.
          When the guesses run out the round ends and any pairs already matched are still paid.
        </p>
      </div>

      <p className="text-xs text-neutral-600">
        All games pay slightly under true odds. That margin is what keeps the house solvent and able to pay withdrawals.
      </p>
    </div>
  );
}
