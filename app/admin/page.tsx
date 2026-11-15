"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/Client";
import { formatAmount } from "@/lib/money";

type Stats = {
  treasury: number; owed: number; held: number; profit: number;
  shortfall: number; stopLoss: number; bankroll: number; paused: boolean;
};

export default function Page() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    const tick = () => api<Stats>("/api/admin/stats").then(setS).catch(() => {});
    tick();
    const i = setInterval(tick, 15_000);
    return () => clearInterval(i);
  }, []);

  if (!s) return <p className="text-neutral-500">Operator access required.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Treasury</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs text-neutral-500">Gold on hand</p>
          <p className="text-xl tabular-nums">{formatAmount(s.treasury)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-neutral-500">Owed to players</p>
          <p className="text-xl tabular-nums">{formatAmount(s.owed + s.held)}</p>
        </div>
        <div className={`card ${s.profit < 0 ? "border-red-800" : "border-emerald-800"}`}>
          <p className="text-xs text-neutral-500">Profit / loss</p>
          <p className={`text-xl tabular-nums ${s.profit < 0 ? "text-red-400" : "text-emerald-400"}`}>
            {s.profit > 0 ? "+" : ""}{formatAmount(s.profit)}
          </p>
        </div>
      </div>
      <p className="text-sm text-neutral-400">
        Declared bankroll {formatAmount(s.bankroll)} · stop-loss at {formatAmount(s.stopLoss)} shortfall
        {s.paused && <span className="text-red-400"> · TABLES PAUSED</span>}
      </p>
      {s.shortfall > 0 && (
        <p className="text-sm text-amber-400">
          Shortfall {formatAmount(s.shortfall)} — you owe more than you hold.
        </p>
      )}
    </div>
  );
}
