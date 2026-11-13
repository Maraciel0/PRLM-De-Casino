"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/Client";
import { formatAmount } from "@/lib/money";

type Row = { id: string; amount: number; refCode: string; gameTxId: string | null; handle: string | null };

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = () => api<{ rows: Row[] }>("/api/admin/deposits").then((d) => setRows(d.rows)).catch(() => {});
  useEffect(() => { load(); const i = setInterval(load, 10_000); return () => clearInterval(i); }, []);

  const act = (id: string, action: string) =>
    api(`/api/admin/deposits/${id}/confirm`, { method: "POST", body: JSON.stringify({ action }) }).then(load);

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Deposit queue</h1>
      {!rows.length && <p className="text-sm text-neutral-500">Empty.</p>}
      {rows.map((r) => (
        <div key={r.id} className="card">
          <div className="flex justify-between">
            <div>
              <p className="font-medium">{formatAmount(r.amount)} gold — {r.handle}</p>
              <p className="mono mt-1 text-neutral-500">tx: {r.gameTxId ?? "—"}</p>
              <p className="mono text-neutral-600">{r.refCode}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => act(r.id, "confirm")}>Confirm</button>
              <button className="danger" onClick={() => act(r.id, "reject")}>Reject</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
