"use client";
import { useEffect, useState } from "react";
import { api, useSession } from "./Client";
import { formatAmount, parseAmount } from "@/lib/money";

type Row = { chanceBps: number; multiplierBps: number; maxBet: number };

export default function Dice() {
  const { text } = useSession();
  const [table, setTable] = useState<Row[]>([]);
  const [minBet, setMinBet] = useState(0);
  const [chance, setChance] = useState(5000);
  const [dir, setDir] = useState<"under" | "over">("under");
  const [bet, setBet] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ table: Row[]; minBet: number }>("/api/games/dice")
      .then((d) => {
        setTable(d.table);
        setMinBet(d.minBet);
      })
      .catch(() => {});
  }, []);

  const row = table.find((r) => r.chanceBps === chance);

  async function roll() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ round: { rollBps: number; won: boolean; payout: number } }>("/api/games/dice/roll", {
        method: "POST",
        body: JSON.stringify({ bet, chanceBps: chance, direction: dir, idempotencyKey: crypto.randomUUID() }),
      });
      setLog((l) =>
        [
          `${(r.round.rollBps / 100).toFixed(2)} — ${r.round.won ? `WIN +${formatAmount(r.round.payout)}` : "LOSS"}`,
          ...l,
        ].slice(0, 20),
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-lg font-semibold">{text.diceTitle ?? "Dice"}</h1>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <select value={chance} onChange={(e) => setChance(Number(e.target.value))}>
            {table.map((r) => (
              <option key={r.chanceBps} value={r.chanceBps}>
                {(r.chanceBps / 100).toFixed(2)}% win
              </option>
            ))}
          </select>
          <select value={dir} onChange={(e) => setDir(e.target.value as "under" | "over")}>
            <option value="under">Roll under</option>
            <option value="over">Roll over</option>
          </select>
          <input value={bet} onChange={(e) => setBet(e.target.value)} placeholder="Bet" inputMode="decimal" />
        </div>
        {row && (
          <p className="mt-3 text-sm text-neutral-400">
            Pays <strong>{formatAmount(row.multiplierBps)}×</strong> · max bet {formatAmount(row.maxBet)} · min {formatAmount(minBet)}
          </p>
        )}
        <button className="mt-3" disabled={busy || !bet || (row && parseAmount(bet) > row.maxBet)} onClick={roll}>
          {busy ? "…" : text.diceRoll ?? "Roll"}
        </button>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      </div>

      <div className="card">
        <h2 className="font-medium">{text.diceLastRolls ?? "Last rolls"}</h2>
        <ul className="mt-2 space-y-1 text-sm text-neutral-400">
          {log.map((l, i) => <li key={i}>{l}</li>)}
          {!log.length && <li>{text.diceNoRolls ?? "No rolls yet."}</li>}
        </ul>
      </div>
    </div>
  );
}
