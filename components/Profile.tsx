"use client";
import { useEffect, useState } from "react";
import { api, useSession } from "./Client";
import { formatAmount } from "@/lib/money";

export default function Profile() {
  const { loading, user, balance, text } = useSession();
  const [code, setCode] = useState<string | null>(null);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ profileCode: string }>("/api/profile").then((d) => setCode(d.profileCode)).catch(() => {});
  }, []);

  if (loading) return <p className="text-neutral-500">Loading…</p>;
  if (!user) {
    return (
      <p>
        Not signed in. <a className="underline" href="/login">{text.loginSignIn ?? "Sign in"}</a>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-lg font-semibold">{text.profileTitle ?? "Your account"}</h1>
        <p className="mt-1 text-sm text-neutral-400">{user.handle}</p>
        <p className="mt-2 text-2xl tabular-nums">
          {formatAmount(balance)} <span className="text-sm text-neutral-500">gold</span>
        </p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-medium">{text.profileCodeTitle ?? "Verification code"}</h2>
        <p className="text-sm text-neutral-400">{text.profileCodeBody ?? ""}</p>
        <p className="mono text-lg tracking-widest">{code ?? "…"}</p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-medium">{text.profileChangeTitle ?? "Change password"}</h2>
        <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Current password" />
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" />
        <button
          onClick={async () => {
            setMsg(null);
            try {
              await api("/api/auth/password", { method: "POST", body: JSON.stringify({ current: cur, next }) });
              setCur("");
              setNext("");
              setMsg("Password changed.");
            } catch (e) {
              setMsg((e as Error).message);
            }
          }}
        >
          Save
        </button>
        {msg && <p className="text-sm text-amber-400">{msg}</p>}
      </div>

      <button className="ghost" onClick={() => api("/api/auth/logout", { method: "POST" }).then(() => location.reload())}>
        {text.homeSignOut ?? "Sign out"}
      </button>
    </div>
  );
}
