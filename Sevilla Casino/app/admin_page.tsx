"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/Client";
import { formatAmount } from "@/lib/money";

export default function Page() {
  const [s, setS] = useState<{ liability: { owed: number; held: number; total: number }; bankroll: number; solvency: number; solvencyPct: number; paused: boolean } | null>(null);

  useEffect(() => {
    api<typeof s>("/api/admin/stats").then(setS).catch(() => {});
    const i = setInterval(() => api<typeof s>("/api/admin/stats").then(setS).catch(() => {}), 15_000);
    return () => clearInterval(i);
  }, []);

  if (!s) return <p className="text-neutral-500">Operator access required.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Solvency</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="text-xs text-neutral-500">Owed to players</p><p className="text-xl tabular-nums">{formatAmount(s.liability.owed)}</p></div>
        <div className="card"><p className="text-xs text-neutral-500">Held withdrawals</p><p className="text-xl tabular-nums">{formatAmount(s.liability.held)}</p></div>
        <div className={`card ${s.solvencyPct < 20 ? "border-red-700" : ""}`}><p className="text-xs text-neutral-500">Solvency</p><p className="text-xl tabular-nums">{s.solvencyPct}%</p></div>
      </div>
      <p className="text-sm text-neutral-400">Bankroll {formatAmount(s.bankroll)} · free {formatAmount(s.solvency)} {s.paused && <span className="text-red-400">· TABLES PAUSED</span>}</p>
    </div>
  );
}