"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, useSession } from "./Client";
import { formatAmount, parseAmount } from "@/lib/money";
import {
  ROULETTE_BET_LABELS, ROULETTE_BET_TYPES, ROULETTE_COLORS, ROULETTE_ORDER,
  rotationForNumber, rouletteColor,
  type RouletteBetType, type RouletteColor,
} from "@/lib/roulette";

const SPIN_MS = 4300;
const STEP = 360 / ROULETTE_ORDER.length;

type Round = {
  id: string; bet: number; betType: RouletteBetType; pick: number | null;
  number: number; color: RouletteColor; won: boolean; payout: number;
  nonce: number; clientSeed: string; serverSeedHash: string; createdAt: string;
  balance?: number;
};
type Limit = { label: string; multiplier: number; maxBet: number };
type Info = {
  paused: boolean; minBet: number; maxWin: number;
  limits: Record<RouletteBetType, Limit>; history: Round[];
};

function point(cx: number, cy: number, r: number, angle: number) {
  const a = (angle * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function sectorPath(index: number) {
  const start = -90 + index * STEP;
  const end = start + STEP;
  const [x1, y1] = point(180, 180, 158, start);
  const [x2, y2] = point(180, 180, 158, end);
  const [ix2, iy2] = point(180, 180, 68, end);
  const [ix1, iy1] = point(180, 180, 68, start);
  return `M ${x1} ${y1} A 158 158 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A 68 68 0 0 0 ${ix1} ${iy1} Z`;
}

export default function Roulette() {
  const { loading, user, balance: sessionBalance, text } = useSession();
  const [info, setInfo] = useState<Info | null>(null);
  const [history, setHistory] = useState<Round[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [bet, setBet] = useState("5");
  const [betType, setBetType] = useState<RouletteBetType>("red");
  const [pick, setPick] = useState(24);
  const [bal, setBal] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (!loading) setBal(sessionBalance); }, [loading, sessionBalance]);

  useEffect(() => {
    api<Info>("/api/games/roulette")
      .then((d) => { setInfo(d); setHistory(d.history); })
      .catch(() => {});
  }, []);

  const spin = useCallback(async () => {
    if (busyRef.current || spinning) return;
    busyRef.current = true;
    setBusy(true);
    setErr(null);
    setRound(null);
    try {
      const body = betType === "number"
        ? { bet, betType, pick }
        : { bet, betType };
      const r = await api<{ round: Round }>("/api/games/roulette", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // The server result is authoritative. Rotate to that pocket, never to a locally picked one.
      const next = rotationForNumber(r.round.number, rotationRef.current);
      rotationRef.current = next;
      setSpinning(true);
      setRotation(next);

      await new Promise((resolve) => setTimeout(resolve, SPIN_MS + 100));
      setRound(r.round);
      setBal(r.round.balance ?? bal);
      setHistory((old) => [r.round, ...old].slice(0, 20));
      setSpinning(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [bal, bet, betType, pick, spinning]);

  const clearHistory = () => {
    if (busy || spinning) return;
    setHistory([]);
    setRound(null);
  };

  if (loading) return <p className="text-neutral-500">Loading…</p>;
  if (!user) {
    return <p>Not signed in. <a className="underline" href="/login">{text.loginSignIn ?? "Sign in"}</a></p>;
  }

  const limit = info?.limits[betType];
  let units = 0;
  try { units = parseAmount(bet); } catch { units = 0; }
  const betOk = units >= (info?.minBet ?? 0) && !!limit && units <= limit.maxBet && units <= bal;
  const disabled = busy || spinning || !betOk || !!info?.paused;
  const net = round ? round.payout - round.bet : 0;
  const resultBorder = !round ? "border-neutral-700 text-neutral-300"
    : round.color === "green" ? "border-emerald-500 text-emerald-300"
      : round.color === "red" ? "border-rose-500 text-rose-300"
        : "border-neutral-500 text-white";

  return (
    <div className="space-y-4">
      <section className="card space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="eyebrow">Parlamentum · Live table</p>
            <h1 className="text-2xl font-semibold">{text.rouletteTitle ?? "Roulette"}</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {text.rouletteIntro ?? "Bet on a pocket. European rules: 37 pockets, zero is green and loses even-money bets."}
            </p>
          </div>
          <div className="stat text-right">
            <p className="stat-label">Balance</p>
            <p className="stat-value gold">{formatAmount(bal)}</p>
          </div>
        </div>
        {info?.paused && <p className="text-sm text-red-400">The tables are paused by the house.</p>}

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
          <div className="mx-auto w-full max-w-[390px]">
            <div className="relative mx-auto aspect-square w-full">
              <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
                <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-gold-bright drop-shadow-lg" />
              </div>
              <div
                className="absolute inset-2 rounded-full border-[9px] border-[#9a7626] bg-[#12151d] p-1 shadow-[0_0_35px_rgba(0,0,0,.65)]"
                style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(.08,.72,.12,1)` : "none" }}
              >
                <svg viewBox="0 0 360 360" className="h-full w-full" role="img" aria-label="European roulette wheel with pockets zero to thirty-six">
                  <circle cx="180" cy="180" r="165" fill="#9a7626" />
                  {ROULETTE_ORDER.map((number, index) => {
                    const mid = -90 + (index + 0.5) * STEP;
                    const [tx, ty] = point(180, 180, 116, mid);
                    return (
                      <g key={number}>
                        <path d={sectorPath(index)} fill={ROULETTE_COLORS[rouletteColor(number)]} stroke="#d0a84a" strokeWidth="1.2" />
                        <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="10" fontWeight="700" transform={`rotate(${mid + 90} ${tx} ${ty})`}>{number}</text>
                      </g>
                    );
                  })}
                  <circle cx="180" cy="180" r="67" fill="#171b24" stroke="#d0a84a" strokeWidth="5" />
                  <circle cx="180" cy="180" r="48" fill="#0b0e17" stroke="#7f6122" strokeWidth="2" />
                  <circle cx="180" cy="180" r="9" fill="#e4b83f" />
                  <path d="M180 132 L190 180 L180 228 L170 180 Z" fill="#d9a728" opacity=".7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--color-line)] bg-[#090c13] p-4 text-center">
              <p className="stat-label">Landed pocket</p>
              <div className={`mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full border-2 text-4xl font-bold ${resultBorder}`}>
                {round ? round.number : "—"}
              </div>
              <p className="mt-2 text-sm capitalize text-neutral-400">
                {!round ? "Ready to spin" : `${round.color} pocket`}
              </p>
              {round && (
                <p className={`mt-1 text-sm ${round.won ? "text-gold-bright" : "text-red-300"}`}>
                  {round.won ? `Win +${formatAmount(net)}` : `Loss -${formatAmount(round.bet)}`}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-neutral-500">Bet</label>
              <input value={bet} onChange={(e) => setBet(e.target.value)} inputMode="decimal" placeholder="Amount" aria-label="Bet amount" />
              <select value={betType} onChange={(e) => setBetType(e.target.value as RouletteBetType)} aria-label="Bet type">
                {ROULETTE_BET_TYPES.map((t) => (
                  <option key={t} value={t}>{ROULETTE_BET_LABELS[t]}</option>
                ))}
              </select>
              {betType === "number" && (
                <select value={pick} onChange={(e) => setPick(Number(e.target.value))} aria-label="Pocket">
                  {ROULETTE_ORDER.slice().sort((a, b) => a - b).map((n) => (
                    <option key={n} value={n}>{n} — {rouletteColor(n)}</option>
                  ))}
                </select>
              )}
            </div>

            <button className="w-full" onClick={spin} disabled={disabled}>
              {spinning ? "Spinning…" : busy ? "…" : text.rouletteSpin ?? "Spin"}
            </button>
            <button className="ghost w-full" onClick={clearHistory} disabled={busy || spinning || history.length === 0}>
              Clear history
            </button>
            {limit && (
              <p className="text-xs leading-relaxed text-neutral-500">
                Pays {formatAmount(limit.multiplier)}× total · max {formatAmount(limit.maxBet)} · min {formatAmount(info?.minBet ?? 0)} gold
              </p>
            )}
            {betType !== "number" && (
              <p className="text-xs text-neutral-500">Zero loses colour, odd/even and 1-18/19-36 bets.</p>
            )}
            {err && <p className="text-sm text-red-400">{err}</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{text.rouletteLastSpins ?? "Recent spins"}</h2>
            <span className="pill">{history.length} recorded</span>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-neutral-500">{text.rouletteNoSpins ?? "No spins yet."}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {history.map((item) => (
                <span key={item.id} className="flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-semibold"
                  style={{ background: ROULETTE_COLORS[item.color], borderColor: item.color === "black" ? "#50545d" : ROULETTE_COLORS[item.color] }}>
                  {item.number}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="card space-y-3">
          <h2 className="text-lg font-semibold">Pocket colours</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="stat"><p className="stat-label">Green</p><p className="stat-value">1</p></div>
            <div className="stat"><p className="stat-label">Red</p><p className="stat-value">18</p></div>
            <div className="stat"><p className="stat-label">Black</p><p className="stat-value">18</p></div>
          </div>
          <p className="text-xs text-neutral-400">Every spin is committed to a hashed seed before it happens, then replayable from the revealed seed and nonce.</p>
        </div>
      </section>
    </div>
  );
}
