const buckets = new Map<string, { n: number; reset: number }>();

export function limit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return true; }
  if (b.n >= max) return false;
  b.n++; return true;
}

export const ip = (r: Request) => r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";