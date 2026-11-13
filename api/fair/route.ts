import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireUser, assertCsrf } from "@/lib/auth";
import { newSeed, hashSeed } from "@/lib/fair";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const u = await requireUser();
  const [me] = await db.select({
    hash: users.serverSeedHash, client: users.clientSeed, nonce: users.nonce, past: users.revealedSeeds,
  }).from(users).where(eq(users.id, u.id)).limit(1);
  return json({ current: me?.hash, clientSeed: me?.client, nonce: me?.nonce, revealed: me?.past ?? [] });
});

export const POST = route(async (req: Request) => {
  await assertCsrf(req);
  const u = await requireUser();
  const body = await req.json().catch(() => ({}));
  const clientSeed = typeof body.clientSeed === "string" ? body.clientSeed.slice(0, 64) : null;

  const [me] = await db.select({ seed: users.serverSeed, hash: users.serverSeedHash, past: users.revealedSeeds })
    .from(users).where(eq(users.id, u.id)).limit(1);
  if (!me) return json({ ok: false });

  const next = newSeed();
  const revealed = [...(me.past as unknown[]), { seed: me.seed, hash: me.hash, at: new Date().toISOString() }];

  await db.update(users).set({
    serverSeed: next, serverSeedHash: hashSeed(next), nonce: 0,
    revealedSeeds: revealed,
    ...(clientSeed ? { clientSeed } : {}),
  }).where(eq(users.id, u.id));

  return json({ ok: true, revealed: me.seed });
});
