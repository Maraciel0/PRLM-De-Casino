import { db } from "@/lib/db";
import { wallets, blackjackRounds } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { maxBetFor } from "@/lib/blackjack";
import { publicView } from "@/lib/blackjack-server";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Table limits, plus the player's unfinished hand if they reloaded mid-round. */
export const GET = route(async () => {
  const s = await getSettings();
  const u = await getUser();

  let current = null;
  if (u) {
    const [r] = await db.select().from(blackjackRounds)
      .where(and(eq(blackjackRounds.userId, u.id), eq(blackjackRounds.status, "active")))
      .orderBy(desc(blackjackRounds.createdAt)).limit(1);
    if (r) {
      const [w] = await db.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
      current = publicView(r, w?.b ?? 0, s.maxWin);
    }
  }

  return json({ paused: s.paused, minBet: s.minBet, maxBet: Math.min(maxBetFor(s.maxWin), s.maxWin), current });
});
