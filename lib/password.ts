import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const a = Buffer.from(key, "hex");
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
