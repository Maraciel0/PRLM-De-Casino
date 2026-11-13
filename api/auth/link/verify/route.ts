import { db } from "@/lib/db";
import { users, wallets } from "@/lib/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import { route, json, fail } from "@/lib/http";

export const POST = route(async (req: Request) => {
  const body = await req.json();
  const code = String(body.code ?? "").toUpperCase();
  const h = String(body.handle ?? "");

  const [pending] = await db.select().from(users)
    .where(and(eq(users.linkCode, code), gt(users.linkCodeExpiresAt, new Date()))).limit(1);
  if (!pending) return fail(400, "Code invalid or expired");

  // Manual verification: operator (or the player, on trust) confirms the code
  // is in their profile. Phase 1 of the roadmap adds a scraper here.
  const operators = (process.env.OPERATOR_HANDLES ?? "").split(",").map((s) => s.trim().toLowerCase());
  const isOp = operators.includes(h.toLowerCase());

  await db.update(users)
    .set({ handle: h, linkedAt: new Date(), linkCode: null, linkCodeExpiresAt: null, role: isOp ? "operator" : "player" })
    .where(eq(users.id, pending.id));
  await db.insert(wallets).values({ userId: pending.id }).onConflictDoNothing();
  await createSession(pending.id);

  return json({ ok: true });
});
