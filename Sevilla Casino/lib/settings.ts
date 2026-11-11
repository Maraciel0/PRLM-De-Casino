import { db } from "./db";
import { settings } from "./db/schema";
import { eq } from "drizzle-orm";

export async function getSettings() {
  const [s] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (!s) throw new Error("Settings row missing — run npm run db:seed");
  return s;
}

export async function updateSettings(patch: Partial<typeof settings.$inferInsert>) {
  await db.update(settings).set({ ...patch, updatedAt: new Date() }).where(eq(settings.id, 1));
}