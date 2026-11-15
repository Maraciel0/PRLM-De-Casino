"use client";
import { useEffect, useState } from "react";

export function csrf() {
  return document.cookie.split("; ").find((c) => c.startsWith("pc_csrf="))?.split("=")[1] ?? "";
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", "x-csrf-token": csrf(), ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}

export function useSession() {
  const [s, setS] = useState<{ loading: boolean; user: { handle: string | null; role: string; linked: boolean } | null; balance: number }>(
    { loading: true, user: null, balance: 0 });
  useEffect(() => {
    api<{ user: { handle: string | null; role: string; linked: boolean } | null; balance: number }>("/api/auth/session")
      .then((d) => setS({ loading: false, user: d.user, balance: d.balance ?? 0 }))
      .catch(() => setS({ loading: false, user: null, balance: 0 }));
  }, []);
  return s;
}
