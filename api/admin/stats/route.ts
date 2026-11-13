import { getLiability } from "@/lib/liability";
import { getSettings } from "@/lib/settings";
import { requireOperator } from "@/lib/auth";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireOperator();
  const [s, liab] = await Promise.all([getSettings(), getLiability()]);
  const solvency = s.bankroll - liab.total;
  return json({
    liability: liab, bankroll: s.bankroll, solvency,
    solvencyPct: s.bankroll ? Math.round((solvency / s.bankroll) * 100) : 0,
    stopLoss: s.stopLossLiability, paused: s.paused,
  });
});
