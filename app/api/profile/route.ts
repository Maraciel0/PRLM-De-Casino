import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const u = await requireUser();
  const [me] = await db.select({ c: users.profileCode }).from(users).where(eq(users.id, u.id)).limit(1);
  return json({ profileCode: me?.c ?? "" });
});
