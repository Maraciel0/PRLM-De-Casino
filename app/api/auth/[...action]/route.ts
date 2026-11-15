import { db } from "@/lib/db";
import { users, wallets } from "@/lib/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { getUser, createSession, destroySession } from "@/lib/auth";
import { newSeed, hashSeed } from "@/lib/fair";
import { handle as handleSchema } from "@/lib/validation";
import { route, json, fail } from "@/lib/http";
import { limit, ip } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ action: string[] }> };
export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const [a] = (await ctx.params).action;
  if (a !== "session") return fail(404, "Not found");

  const u = await getUser();
  if (!u) return json({ user: null });
  const [w] = await db.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
  return json({ user: u, balance: w?.b ?? 0 });
});

export const POST = route(async (req: Request, ctx: Ctx) => {
  const key = (await ctx.params).action.join("/");

  if (key === "logout") {
    await destroySession();
    return json({ ok: true });
  }

  if (key === "link/start") {
    if (!limit(`ls:${ip(req)}`, 10, 60_000)) return fail(429, "Slow down");
    const h = handleSchema.parse((await req.json()).handle);
    const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const exp = new Date(Date.now() + 15 * 60_000);
    const existing = await getUser();

    if (existing) {
      await db.update(users).set({ linkCode: code, linkCodeExpiresAt: exp, handle: h }).where(eq(users.id, existing.id));
    } else {
      const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.handle, h)).limit(1);
      if (existingUser) {
        await db.update(users).set({ linkCode: code, linkCodeExpiresAt: exp }).where(eq(users.id, existingUser.id));
      } else {
        const seed = newSeed();
        const [u] = await db.insert(users)
          .values({ linkCode: code, linkCodeExpiresAt: exp, handle: h, serverSeed: seed, serverSeedHash: hashSeed(seed) })
          .returning({ id: users.id });
        await db.insert(wallets).values({ userId: u.id }).onConflictDoNothing();
      }
    }  
    return json({ code });
  }

  if (key === "link/verify") {
    const body = await req.json();
    const code = String(body.code ?? "").toUpperCase();
    const h = String(body.handle ?? "");

    const [pending] = await db.select().from(users)
      .where(and(eq(users.linkCode, code), gt(users.linkCodeExpiresAt, new Date()))).limit(1);
    if (!pending) return fail(400, "Code invalid or expired");

    const ops = (process.env.OPERATOR_HANDLES ?? "").split(",").map((s) => s.trim().toLowerCase());
    await db.update(users).set({
      handle: h, linkedAt: new Date(), linkCode: null, linkCodeExpiresAt: null,
      role: ops.includes(h.toLowerCase()) ? "operator" : "player",
    }).where(eq(users.id, pending.id));
    await db.insert(wallets).values({ userId: pending.id }).onConflictDoNothing();
    await createSession(pending.id);
    return json({ ok: true });
  }

  return fail(404, "Not found");
});
