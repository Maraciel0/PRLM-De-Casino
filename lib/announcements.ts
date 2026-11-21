import { db } from "./db";
import { announcements } from "./db/schema";
import { desc, eq } from "drizzle-orm";

export const getActiveAnnouncements = () =>
  db.select().from(announcements).where(eq(announcements.active, true)).orderBy(desc(announcements.createdAt)).limit(5);

export const getAllAnnouncements = () =>
  db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(50);
