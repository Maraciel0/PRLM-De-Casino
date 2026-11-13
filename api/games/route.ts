import { table } from "@/lib/dice";
import { getSettings } from "@/lib/settings";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const s = await getSettings();
  return json({
    games: [{ slug: "dice", name: "Dice", live: true, edgeBps: s.houseEdgeBps }],
    paused: s.paused,
    minBet: s.minBet,
    maxWin: s.maxWin,
    table: await table(),
  });
});
