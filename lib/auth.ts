import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

const SESSION = "pc_session";
const CSRF = "pc_csrf";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET!);

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type SessionUser = { id: string; handle: string | null; role: "player" | "operator"; linked: boolean };

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(key());
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(SESSION, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 2_592_000 });
  jar.set(CSRF, crypto.randomUUID(), { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: 2_592_000 });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION); jar.delete(CSRF);
}

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const [u] = await db.select({ id: users.id, handle: users.handle, role: users.role, linkedAt: users.linkedAt })
      .from(users).where(eq(users.id, payload.sub as string)).limit(1);
    return u ? { id: u.id, handle: u.handle, role: u.role, linked: !!u.linkedAt } : null;
  } catch { return null; }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) throw new HttpError(401, "Sign in first");
  return u;
}

export async function requireOperator(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "operator") throw new HttpError(403, "Operators only");
  return u;
}

export async function assertCsrf(req: Request) {
  const expected = (await cookies()).get(CSRF)?.value;
  if (!expected || req.headers.get("x-csrf-token") !== expected) throw new HttpError(403, "Bad CSRF token");
}
