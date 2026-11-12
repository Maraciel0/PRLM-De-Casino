import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { wallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const u = await getUser();
  if (!u) return json({ user: null });
  const [w] = await db.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, u.id)).limit(1);
  return json({ user: u, balance: w?.b ?? 0 });
});