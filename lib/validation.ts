import { z } from "zod";
import { parseAmount } from "./money";
import { CHANCES_BPS } from "./dice";

const amount = z.string().trim()
  .refine((v) => { try { return parseAmount(v) > 0; } catch { return false; } }, "Bad amount")
  .transform(parseAmount);

export const handle = z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9_.-]+$/);

export const depositInput = z.object({
  amount, idempotencyKey: z.string().uuid(),
  gameTxId: z.string().trim().min(3).max(120),
});

export const withdrawInput = z.object({ amount, idempotencyKey: z.string().uuid() });

export const rollInput = z.object({
  bet: amount,
  chanceBps: z.number().int().refine((v) => CHANCES_BPS.includes(v), "Pick a listed chance"),
  direction: z.enum(["under", "over"]),
  idempotencyKey: z.string().uuid(),
});

export const settingsInput = z.object({
  houseEdgeBps: z.number().int().min(100).max(1000).optional(),
  minBet: z.number().int().min(1).optional(),
  maxWin: z.number().int().min(1000).optional(),
  maxPendingWithdrawals: z.number().int().min(1).max(20).optional(),
  bankroll: z.number().int().min(1000).optional(),
  stopLossLiability: z.number().int().min(1000).optional(),
  paused: z.boolean().optional(),
  payoutSlaMinutes: z.number().int().min(5).max(1440).optional(),
});

export const signupInput = z.object({
  username: handle,
  password: z.string().min(10).max(200),
});

export const loginInput = z.object({
  username: handle,
  password: z.string().min(1).max(200),
});

export const passwordInput = z.object({
  current: z.string().min(1),
  next: z.string().min(10).max(200),
});

export const announcementInput = z.object({ body: z.string().trim().min(1).max(2000) });


export const memoryGuessInput = z.object({
  roundId: z.string().uuid(),
  a: z.number().int().min(0),
  b: z.number().int().min(0),
});

export const memoryStartInput = z.object({
  difficulty: z.enum(["easy", "normal", "hard"]),
});

export const blackjackStartInput = z.object({ bet: amount });

export const blackjackActInput = z.object({
  roundId: z.string().uuid(),
  action: z.enum(["hit", "stand", "double"]),
});
