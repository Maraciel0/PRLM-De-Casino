import {
  pgTable, pgEnum, uuid, text, bigint, integer, timestamp, jsonb, boolean, index,
} from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["player", "operator"]);
export const direction = pgEnum("direction", ["deposit", "withdraw"]);
export const status = pgEnum("status", [
  "awaiting_operator", "held", "paid", "confirmed", "rejected", "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: role("role").notNull().default("player"),
  handle: text("handle").unique(),
  linkCode: text("link_code"),
  linkCodeExpiresAt: timestamp("link_code_expires_at", { withTimezone: true }),
  linkedAt: timestamp("linked_at", { withTimezone: true }),
  // provably fair state
  serverSeed: text("server_seed").notNull(),
  serverSeedHash: text("server_seed_hash").notNull(),
  clientSeed: text("client_seed").notNull().default(""),
  nonce: integer("nonce").notNull().default(0),
  revealedSeeds: jsonb("revealed_seeds").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  passwordHash: text("password_hash"),
  profileCode: text("profile_code").unique(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  houseEdgeBps: integer("house_edge_bps").notNull().default(300),
  minBet: bigint("min_bet", { mode: "number" }).notNull().default(10_000),
  maxWin: bigint("max_win", { mode: "number" }).notNull().default(1_000_000),
  maxPendingWithdrawals: integer("max_pending_withdrawals").notNull().default(3),
  bankroll: bigint("bankroll", { mode: "number" }).notNull().default(5_000_000),
  stopLossLiability: bigint("stop_loss_liability", { mode: "number" }).notNull().default(4_000_000),
  paused: boolean("paused").notNull().default(false),
  payoutSlaMinutes: integer("payout_sla_minutes").notNull().default(30),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wallets = pgTable("wallets", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transfers = pgTable("transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  direction: direction("direction").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  status: status("status").notNull(),
  refCode: text("ref_code").notNull().unique(),
  gameTxId: text("game_tx_id"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  operatorNote: text("operator_note"),
  handledBy: uuid("handled_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("transfers_status_idx").on(t.status, t.createdAt),
  index("transfers_user_idx").on(t.userId, t.createdAt),
]);

export const rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  game: text("game").notNull(),
  bet: bigint("bet", { mode: "number" }).notNull(),
  multiplierBps: integer("multiplier_bps").notNull(),
  chanceBps: integer("chance_bps").notNull(),
  rollBps: integer("roll_bps").notNull(),
  won: boolean("won").notNull(),
  payout: bigint("payout", { mode: "number" }).notNull(),
  nonce: integer("nonce").notNull(),
  clientSeed: text("client_seed").notNull(),
  serverSeedHash: text("server_seed_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("rounds_user_idx").on(t.userId, t.createdAt)]);

export const ledger = pgTable("ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  delta: bigint("delta", { mode: "number" }).notNull(),
  balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
  kind: text("kind").notNull(),
  ref: text("ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ledger_user_idx").on(t.userId, t.createdAt)]);

/** Every operator action, immutable. */
export const audit = pgTable("audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  target: text("target").notNull(),
  detail: jsonb("detail").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
