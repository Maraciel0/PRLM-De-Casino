import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const g = globalThis as unknown as { pg?: postgres.Sql };

const client = g.pg ?? postgres(process.env.DATABASE_URL!, { max: 5, prepare: false });
if (process.env.NODE_ENV !== "production") g.pg = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
