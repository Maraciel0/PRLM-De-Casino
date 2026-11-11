import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { table } from "@/lib/dice";
import { getSettings } from "@/lib/settings";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const u = await requireUser();
  const s = await getSettings();
  const [me] = await db.select({ hash: users.serverSeedHash, client: users.clientSeed, nonce: users.nonce })
    .from(users).where(eq(users.id, u.id)).limit(1);

  return json({
    paused: s.paused, minBet: s.minBet, maxWin: s.maxWin,
    edgeBps: s.houseEdgeBps, table: await table(),
    seed: { hash: me?.hash, clientSeed: me?.client, nonce: me?.nonce },
  });
});