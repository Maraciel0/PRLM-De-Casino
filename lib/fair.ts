import { createHash, createHmac, randomBytes } from "node:crypto";

export const newSeed = () => randomBytes(32).toString("hex");
export const hashSeed = (s: string) => createHash("sha256").update(s).digest("hex");

/** Deterministic float in [0,1) from seed pair + nonce. */
export function rollFloat(serverSeed: string, clientSeed: string, nonce: number): number {
  const h = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}`).digest("hex");
  return parseInt(h.slice(0, 8), 16) / 0x1_0000_0000;
}