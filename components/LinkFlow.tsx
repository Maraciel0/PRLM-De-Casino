"use client";
import { useState } from "react";
import { api } from "./Client";

export default function LinkFlow() {
  const [handle, setHandle] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [entered, setEntered] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="card space-y-4">
      <h1 className="text-lg font-semibold">Link your account</h1>
      {!code ? (
        <>
          <p className="text-sm text-neutral-400">Your in-game handle.</p>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="handle" />
          <button disabled={handle.length < 2} onClick={async () => {
            setErr(null);
            try { setCode((await api<{ code: string }>("/api/auth/link/start", { method: "POST", body: JSON.stringify({ handle }) })).code); }
            catch (e) { setErr((e as Error).message); }
          }}>Get code</button>
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-400">Put this code in your game profile, save, then type it below.</p>
          <p className="rounded-lg bg-neutral-800 p-3 text-center font-mono text-lg tracking-widest">{code}</p>
          <input value={entered} onChange={(e) => setEntered(e.target.value)} maxLength={8} placeholder="code" />
          <button disabled={entered.length !== 8} onClick={async () => {
            setErr(null);
            try { await api("/api/auth/link/verify", { method: "POST", body: JSON.stringify({ handle, code: entered }) }); location.href = "/"; }
            catch (e) { setErr((e as Error).message); }
          }}>Verify</button>
        </>
      )}
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}