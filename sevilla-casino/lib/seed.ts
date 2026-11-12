import { db } from "../lib/db";
import { settings } from "../lib/db/schema";

async function main() {
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
  console.log("Settings seeded.");
  process.exit(0);
}
main();