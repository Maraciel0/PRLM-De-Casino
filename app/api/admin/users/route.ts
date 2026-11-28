import { db } from "@/lib/db";
import { users, wallets, ledger } from "@/lib/db/schema";
import { asc, desc, eq, ilike, sql } from "drizzle-orm";
import { requireOperator } from "@/lib/auth";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

/**
 * Operator-only user directory. Deliberately returns no password hashes, seeds or link codes.
 * Query: ?q=<handle search>&sort=newest|active|balance|name&page=<n>
 */
export const GET = route(async (req: Request) => {
  await requireOperator();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 40).replace(/[%_\\]/g, "");
  const sort = url.searchParams.get("sort") ?? "newest";
  const page = Math.max(1, Math.min(10_000, parseInt(url.searchParams.get("page") ?? "1", 10) || 1));

  const where = q ? ilike(users.handle, `%${q}%`) : undefined;
  const lastActive = sql<string | null>`(select max(${ledger.createdAt}) from ${ledger} where ${ledger.userId} = ${users.id})`;

  const order =
    sort === "balance" ? [desc(sql`coalesce(${wallets.balance}, 0)`), asc(users.handle)]
    : sort === "name" ? [asc(users.handle)]
    : sort === "active" ? [sql`${lastActive} desc nulls last`]
    : [desc(users.createdAt)];

  const [rows, [matching], [summary]] = await Promise.all([
    db.select({
      id: users.id,
      handle: users.handle,
      role: users.role,
      profileCode: users.profileCode,
      linkedAt: users.linkedAt,
      createdAt: users.createdAt,
      balance: wallets.balance,
      rolls: users.nonce,
      lastActive,
    }).from(users).leftJoin(wallets, eq(wallets.userId, users.id))
      .where(where).orderBy(...order).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),

    db.select({ n: sql<number>`count(*)::int` }).from(users).where(where),

    db.select({
      total: sql<number>`count(*)::int`,
      linked: sql<number>`count(${users.linkedAt})::int`,
      held: sql<number>`coalesce(sum(${wallets.balance}), 0)::float8`,
    }).from(users).leftJoin(wallets, eq(wallets.userId, users.id)),
  ]);

  return json({
    rows: rows.map((r) => ({ ...r, balance: r.balance ?? 0 })),
    page,
    pageSize: PAGE_SIZE,
    matching: matching?.n ?? 0,
    summary,
  });
});
