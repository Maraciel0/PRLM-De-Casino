"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/Client";
import { formatAmount } from "@/lib/money";

type Row = {
  id: string; handle: string | null; role: "player" | "operator"; profileCode: string | null;
  linkedAt: string | null; createdAt: string; balance: number; rolls: number; lastActive: string | null;
};
type Res = {
  rows: Row[]; page: number; pageSize: number; matching: number;
  summary: { total: number; linked: number; held: number };
};

const SORTS = [
  ["newest", "Newest"],
  ["active", "Recently active"],
  ["balance", "Highest balance"],
  ["name", "Name A–Z"],
] as const;

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function Page() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [sort, setSort] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Debounce the search box and jump back to page 1 whenever the filters change.
  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api<Res>(`/api/admin/users?q=${encodeURIComponent(dq)}&sort=${sort}&page=${page}`)
      .then((d) => { if (live) { setData(d); setErr(null); } })
      .catch((e) => { if (live) setErr((e as Error).message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [dq, sort, page]);

  if (err && !data) return <p className="text-neutral-500">Operator access required. <span className="text-xs">({err})</span></p>;

  const pages = data ? Math.max(1, Math.ceil(data.matching / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="text-2xl font-semibold">Users</h1>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-2">
          <div className="stat"><p className="stat-label">Total users</p><p className="stat-value">{data.summary.total}</p></div>
          <div className="stat"><p className="stat-label">Linked</p><p className="stat-value">{data.summary.linked}</p></div>
          <div className="stat"><p className="stat-label">Held balances</p><p className="stat-value gold">{formatAmount(data.summary.held)}</p></div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by handle…" aria-label="Search users" />
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort users" className="sm:w-52">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[0.68rem] uppercase tracking-[0.14em] text-neutral-500">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
              <th className="px-4 py-3 text-right font-medium">Rounds</th>
              <th className="px-4 py-3 font-medium">Last active</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
            {data?.rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{r.handle ?? <span className="text-neutral-500">(no handle)</span>}</p>
                  {r.profileCode && <p className="mono text-neutral-500">{r.profileCode}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.role === "operator" && <span className="pill">Operator</span>}
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${r.linkedAt ? "border-emerald-800 text-emerald-400" : "border-neutral-700 text-neutral-500"}`}>
                      {r.linkedAt ? "Linked" : "Not linked"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gold-bright">{formatAmount(r.balance)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-300">{r.rolls}</td>
                <td className="px-4 py-3 whitespace-nowrap text-neutral-400">{fmtDate(r.lastActive)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-neutral-400">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {data && data.rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">No users match “{dq}”.</td></tr>
            )}
            {!data && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-neutral-400">
        <span>{data ? `${data.matching} user${data.matching === 1 ? "" : "s"}` : ""}{dq && data ? ` matching “${dq}”` : ""}</span>
        <div className="flex items-center gap-2">
          <button className="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>Prev</button>
          <span className="tabular-nums">{page} / {pages}</span>
          <button className="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages || loading}>Next</button>
        </div>
      </div>
    </div>
  );
}
