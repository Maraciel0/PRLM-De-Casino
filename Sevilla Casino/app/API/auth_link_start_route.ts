import { db } from "@/lib/db";
import { users, wallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handle } from "@/lib/validation";
import { getUser } from "@/lib/auth";
import { newSeed, hashSeed } from "@/lib/fair";
import { route, json, fail } from "@/lib/http";
import { limit, ip } from "@/lib/rate-limit";

export const POST = route(async (req: Request) => {
  if (!limit(`ls:${ip(req)}`, 10, 60_000)) return fail(429, "Slow down");
  const { handle: h } = { handle: handle.parse((await req.json()).handle) };

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const exp = new Date(Date.now() + 15 * 60_000);
  const existing = await getUser();

  if (existing) {
    await db.update(users).set({ linkCode: code, linkCodeExpiresAt: exp, handle: h }).where(eq(users.id, existing.id));
  } else {
    const seed = newSeed();
    const [u] = await db.insert(users)
      .values({ linkCode: code, linkCodeExpiresAt: exp, handle: h, serverSeed: seed, serverSeedHash: hashSeed(seed) })
      .returning({ id: users.id });
    await db.insert(wallets).values({ userId: u.id }).onConflictDoNothing();
  }

  return json({ code });
});