"use client";

import { useMemo, useState } from "react";

const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colorOf = (n: number) => n === 0 ? "green" : RED.has(n) ? "red" : "black";
const COLORS = { green: "#16834b", red: "#b92e36", black: "#20242d" };
type Result = { number: number; color: string; id: number };

function point(cx: number, cy: number, r: number, angle: number) {
  const a = (angle * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function sectorPath(index: number) {
  const step = 360 / ORDER.length;
  const start = -90 + index * step;
  const end = start + step;
  const [x1, y1] = point(180, 180, 158, start);
  const [x2, y2] = point(180, 180, 158, end);
  const [ix2, iy2] = point(180, 180, 68, end);
  const [ix1, iy1] = point(180, 180, 68, start);
  return `M ${x1} ${y1} A 158 158 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A 68 68 0 0 0 ${ix1} ${iy1} Z`;
}

export default function ProbabilityWheel() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [spinId, setSpinId] = useState(0);
  const [showStats, setShowStats] = useState(false);

  const counts = useMemo(() => {
    const values = new Map<number, number>();
    history.forEach((item) => values.set(item.number, (values.get(item.number) ?? 0) + 1));
    return values;
  }, [history]);

  function spin() {
    if (spinning) return;
    const index = Math.floor(Math.random() * ORDER.length);
    const number = ORDER[index];
    const step = 360 / ORDER.length;
    const targetAngle = (360 - ((index + 0.5) * step) % 360) % 360;
    const currentAngle = ((rotation % 360) + 360) % 360;
    const alignment = (targetAngle - currentAngle + 360) % 360;
    const finalRotation = rotation + 360 * (6 + Math.floor(Math.random() * 3)) + alignment;
    setSpinning(true);
    setResult(null);
    setRotation(finalRotation);
    const currentId = spinId + 1;
    setSpinId(currentId);
    window.setTimeout(() => {
      setResult(number);
      setHistory((old) => [{ number, color: colorOf(number), id: currentId }, ...old].slice(0, 20));
      setSpinning(false);
    }, 4300);
  }

  function reset() {
    if (spinning) return;
    setHistory([]);
    setResult(null);
    setRotation(0);
    setSpinId(0);
  }

  const resultColor = result === null ? "neutral" : colorOf(result);
  const resultStyle = resultColor === "neutral" ? "border-neutral-700 text-neutral-300" :
    resultColor === "green" ? "border-emerald-500 text-emerald-300" :
    resultColor === "red" ? "border-rose-500 text-rose-300" : "border-neutral-500 text-white";

  return (
    <div className="space-y-4">
      <section className="card space-y-4">
        <div>
          <p className="eyebrow">Parlamentum · Probability lab</p>
          <h1 className="text-2xl font-semibold">Number wheel</h1>
          <p className="mt-2 text-sm text-neutral-400">
            A no-bets probability demonstration using 37 equally likely outcomes. Spin the wheel and explore how random results vary.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
          <div className="mx-auto w-full max-w-[390px]">
            <div className="relative mx-auto aspect-square w-full">
              <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
                <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-gold-bright drop-shadow-lg" />
              </div>
              <div
                className="absolute inset-2 rounded-full border-[9px] border-[#9a7626] bg-[#12151d] p-1 shadow-[0_0_35px_rgba(0,0,0,.65)]"
                style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 4.3s cubic-bezier(.08,.72,.12,1)" : "none" }}
              >
                <svg viewBox="0 0 360 360" className="h-full w-full" role="img" aria-label="European-style number wheel with numbers zero to thirty-six">
                  <circle cx="180" cy="180" r="165" fill="#9a7626" />
                  {ORDER.map((number, index) => {
                    const step = 360 / ORDER.length;
                    const mid = -90 + (index + 0.5) * step;
                    const [tx, ty] = point(180, 180, 116, mid);
                    return (
                      <g key={number}>
                        <path d={sectorPath(index)} fill={COLORS[colorOf(number) as keyof typeof COLORS]} stroke="#d0a84a" strokeWidth="1.2" />
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
              <p className="stat-label">Latest result</p>
              <div className={`mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full border-2 text-4xl font-bold ${resultStyle}`}>
                {result === null ? "—" : result}
              </div>
              <p className="mt-2 text-sm capitalize text-neutral-400">{result === null ? "Ready to spin" : `${resultColor} pocket`}</p>
            </div>
            <button className="w-full" onClick={spin} disabled={spinning}>
              {spinning ? "Spinning…" : "Spin wheel"}
            </button>
            <button className="ghost w-full" onClick={reset} disabled={spinning || history.length === 0}>Reset history</button>
            <p className="text-xs leading-relaxed text-neutral-500">
              Every pocket has the same chance on each spin: 1 in 37 (about 2.70%). Previous results do not affect future spins.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent results</h2>
            <span className="pill">{history.length} recorded</span>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-neutral-500">Spin the wheel to start a results history.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {history.map((item) => (
                <span key={item.id} className="flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-semibold"
                  style={{ background: COLORS[item.color as keyof typeof COLORS], borderColor: item.color === "black" ? "#50545d" : COLORS[item.color as keyof typeof COLORS] }}>
                  {item.number}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Probability facts</h2>
            <button className="ghost text-xs" onClick={() => setShowStats((v) => !v)}>{showStats ? "Hide counts" : "Show counts"}</button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="stat"><p className="stat-label">Green</p><p className="stat-value">1</p></div>
            <div className="stat"><p className="stat-label">Red</p><p className="stat-value">18</p></div>
            <div className="stat"><p className="stat-label">Black</p><p className="stat-value">18</p></div>
          </div>
          <p className="text-xs text-neutral-400">Each individual number is equally likely. Red and black each contain 18 of the 37 pockets; green contains one.</p>
          {showStats && (
            <div className="max-h-32 overflow-y-auto rounded-lg border border-[var(--color-line)] p-2">
              <div className="grid grid-cols-6 gap-1">
                {ORDER.map((n) => <div key={n} className="rounded bg-[#11151e] px-1 py-1 text-center text-xs text-neutral-300">{n}: {counts.get(n) ?? 0}</div>)}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
