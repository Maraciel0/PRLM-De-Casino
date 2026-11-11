"use client";
import { useEffect, useState } from "react";
import { api } from "./Client";
import { formatAmount } from "@/lib/money";

type T = { id: string; direction: string; amount: number; status: string; refCode: string };

export default function WalletPanel() {
  const [balance, setBalance] = useState(0);
  const [moves, setMoves] = useState<T[]>([]);
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [house, setHouse] = useState<string>("");

  const load = () => api<{ balance: number; transfers: T[] }>("/api/wallet")
    .then((d) => { setBalance(d.balance); setMoves(d.transfers); });
  useEffect(() => { load().catch(() => {}); }, []);

  async function deposit() {
    setMsg(null);
    try {
      const r = await api<{ transfer: { refCode: string } }>("/api/wallet/deposit", {
        method: "POST", body: JSON.stringify({ amount, gameTxId: txId, idempotencyKey: crypto.randomUUID() }),
      });
      setHouse(r.transfer.refCode); setMsg(`Sent in-game? Ticket ${r.transfer.refCode} is queued for review.`); load();
    } catch (e) { setMsg((e as Error).message); }
  }

  async function withdraw() {
    setMsg(null);
    try {
      await api("/api/wallet/withdraw", { method: "POST", body: JSON.stringify({ amount, idempotencyKey: crypto.randomUUID() }) });
      setMsg("Withdrawal held. The house sends within the stated SLA."); load();
    } catch (e) { setMsg((e as Error).message); }
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <h1 className="text-lg font-semibold">Wallet</h1>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{formatAmount(balance)} <span className="text-sm text-neutral-500">gold</span></p>
        <input className="mt-4" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" inputMode="decimal" />
        <input className="mt-2" value={txId} onChange={(e) => setTxId(e.target.value)} placeholder="In-game transaction ID (deposits only)" />
        <div className="mt-3 flex gap-2">
          <button onClick={deposit} disabled={!amount || !txId}>Deposit</button>
          <button className="ghost" onClick={withdraw} disabled={!amount}>Withdraw</button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">Send deposits in-game to <strong>{process.env.NEXT_PUBLIC_HOUSE ?? "the house account"}</strong> first, then submit the ticket.</p>
        {msg && <p className="mt-2 text-sm text-amber-400">{msg}</p>}
      </div>
      <div className="card">
        <h2 className="font-medium">History</h2>
        <ul className="mt-2 divide-y divide-neutral-800 text-sm">
          {moves.map((t) => (
            <li key={t.id} className="flex justify-between py-2">
              <span className={t.direction === "deposit" ? "text-emerald-400" : "text-red-400"}>
                {t.direction === "deposit" ? "+" : "−"}{formatAmount(t.amount)}
              </span>
              <span className="text-neutral-500">{t.refCode} · {t.status}</span>
            </li>
          ))}
          {!moves.length && <li className="py-2 text-neutral-500">Nothing yet.</li>}
        </ul>
      </div>
    </div>
  );
}