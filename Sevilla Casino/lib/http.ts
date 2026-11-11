import { NextResponse } from "next/server";
import { HttpError } from "./auth";

export const json = (d: unknown, s = 200) => NextResponse.json(d, { status: s });
export const fail = (s: number, m: string) => NextResponse.json({ error: m }, { status: s });

export function route<T extends unknown[]>(fn: (...a: T) => Promise<Response>) {
  return async (...a: T) => {
    try { return await fn(...a); }
    catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      if (e instanceof Error && e.name === "ZodError") return fail(400, "Invalid input");
      console.error(e);
      return fail(500, "Internal error");
    }
  };
}