"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/Client";
import { formatAmount } from "@/lib/money";

type Row = {
  id: string; amount: number; refCode: string; status: string;
  handle: string | null; profileCode: string | null; createdAt: string;
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tx, setTx] = useState<Record<string, string>>({});
  const load = () => api<{ rows: Row[] }>("/api/admin/withdrawals").then((d) => setRows(d.rows)).catch(() => {});
  useEffect(() => { load(); const i = setInterval(load, 10_000); return () => clearInterval(i); }, []);

  const act = (id: string, action: "paid" | "reject") =>
    api(`/api/admin/withdrawals/${id}/paid`, { method: "POST", body: JSON.stringify({ action, gameTxId: tx[id] }) }).then(load);

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Withdrawal queue</h1>
      <p className="text-sm text-neutral-500">
        Send the gold in-game to this handle, then paste the send transaction ID and mark it paid.
      </p>
      {!rows.length && <p className="text-sm text-neutral-500">Empty.</p>}
      {rows.map((r) => (
        <div key={r.id} className="card">
          <p className="font-medium">{formatAmount(r.amount)} gold — {r.handle}</p>
          <p className="mono mt-1 text-amber-400">code: {r.profileCode ?? "—"}</p>
          <p className="mono text-neutral-600">ticket: {r.refCode} · {r.status}</p>
          <input className="mt-2" placeholder="send tx id" value={tx[r.id] ?? ""}
            onChange={(e) => setTx((p) => ({ ...p, [r.id]: e.target.value }))} />
          <div className="mt-2 flex gap-2">
            <button onClick={() => act(r.id, "paid")}>Mark paid</button>
            <button className="danger" onClick={() => act(r.id, "reject")}>Reject &amp; refund</button>
          </div>
        </div>
      ))}
    </div>
  );
}
