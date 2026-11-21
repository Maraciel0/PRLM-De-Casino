import { db } from "@/lib/db";
import { users, wallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser, createSession, destroySession, requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { newSeed, hashSeed } from "@/lib/fair";
import { signupInput, loginInput, passwordInput } from "@/lib/validation";
import { refCode } from "@/lib/ref";
import { route, json, fail } from "@/lib/http";
import { limit, ip } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ action: string[] }> };
export const dynamic = "force-dynamic";

const ops = () => (process.env.OPERATOR_HANDLES ?? "").split(",").map((s) => s.trim().toLowerCase());

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

  if (key === "signup") {
    if (!limit(`su:${ip(req)}`, 5, 600_000)) return fail(429, "Slow down");
    const { username, password } = signupInput.parse(await req.json());

    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.handle, username)).limit(1);
    if (taken) return fail(409, "That username is taken");

    const seed = newSeed();
    const [u] = await db.insert(users).values({
      handle: username,
      passwordHash: hashPassword(password),
      profileCode: refCode("USR"),
      linkedAt: new Date(),
      role: ops().includes(username.toLowerCase()) ? "operator" : "player",
      serverSeed: seed,
      serverSeedHash: hashSeed(seed),
    }).returning({ id: users.id });

    await db.insert(wallets).values({ userId: u.id }).onConflictDoNothing();
    await createSession(u.id);
    return json({ ok: true });
  }

  if (key === "login") {
    if (!limit(`li:${ip(req)}`, 10, 300_000)) return fail(429, "Slow down");
    const { username, password } = loginInput.parse(await req.json());

    const [u] = await db.select().from(users).where(eq(users.handle, username)).limit(1);
    if (!u?.passwordHash || !verifyPassword(password, u.passwordHash)) {
      return fail(401, "Wrong username or password");
    }
    await createSession(u.id);
    return json({ ok: true });
  }

  if (key === "password") {
    const me = await requireUser();
    const { current, next } = passwordInput.parse(await req.json());
    const [u] = await db.select({ h: users.passwordHash }).from(users).where(eq(users.id, me.id)).limit(1);
    if (!u?.h || !verifyPassword(current, u.h)) return fail(401, "Current password is wrong");
    await db.update(users).set({ passwordHash: hashPassword(next) }).where(eq(users.id, me.id));
    return json({ ok: true });
  }

  return fail(404, "Not found");
});
