"use client";
import { useEffect, useState } from "react";
import { api } from "./Client";

type Revealed = { seed: string; hash: string; at: string };

export default function Fair() {
  const [cur, setCur] = useState<{ current: string; clientSeed: string; nonce: number; revealed: Revealed[] } | null>(null);
  const [client, setClient] = useState("");

  const load = () => api<{ current: string; clientSeed: string; nonce: number; revealed: Revealed[] }>("/api/fair").then(setCur).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-lg font-semibold">Provably fair</h1>
        <p className="mt-2 text-sm text-neutral-400">
          The house commits to a hashed server seed before you play. Every roll is HMAC-SHA256(serverSeed, clientSeed:nonce).
          Rotate to reveal the old seed and verify your history.
        </p>
        {cur && (
          <>
            <p className="mono mt-3">current hash: {cur.current}</p>
            <p className="mt-1 text-sm text-neutral-500">nonce {cur.nonce}</p>
            <input className="mt-3" value={client} onChange={(e) => setClient(e.target.value)} placeholder="your client seed" />
            <button className="mt-2" onClick={async () => { await api("/api/fair", { method: "POST", body: JSON.stringify({ clientSeed: client }) }); setClient(""); load(); }}>
              Rotate and reveal
            </button>
          </>
        )}
      </div>
      <div className="card">
        <h2 className="font-medium">Revealed seeds</h2>
        <ul className="mt-2 space-y-2 text-xs">
          {(cur?.revealed ?? []).slice().reverse().map((r) => (
            <li key={r.at}><span className="mono">{r.seed}</span><br /><span className="text-neutral-500">{r.at}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}