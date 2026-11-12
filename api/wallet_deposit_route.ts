import { db } from "@/lib/db";
import { transfers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, assertCsrf } from "@/lib/auth";
import { depositInput } from "@/lib/validation";
import { refCode } from "@/lib/ref";
import { route, json, fail } from "@/lib/http";
import { limit } from "@/lib/rate-limit";

export const POST = route(async (req: Request) => {
  await assertCsrf(req);
  const u = await requireUser();
  if (!u.linked) return fail(409, "Link your account first");
  if (!limit(`dep:${u.id}`, 10, 60_000)) return fail(429, "Slow down");

  const { amount, idempotencyKey, gameTxId } = depositInput.parse(await req.json());

  const [dup] = await db.select().from(transfers).where(eq(transfers.idempotencyKey, idempotencyKey)).limit(1);
  if (dup) return json({ transfer: dup, replay: true });

  const [t] = await db.insert(transfers).values({
    userId: u.id, direction: "deposit", amount, status: "awaiting_operator",
    refCode: refCode("DEP"), gameTxId, idempotencyKey,
  }).returning();

  return json({ transfer: t });
});