"use client";
import { useState } from "react";
import { api, useSession } from "./Client";
import { formatAmount } from "@/lib/money";

type Difficulty = "easy" | "normal" | "hard";
type Layout = "grid" | "deck" | "arc";

type GuessRes = {
  values: [number, number]; matched: boolean; pairsFound: number;
  guessesLeft: number; payout: number; status: string; balance: number;
};

const SIZE = 10;
const HOLD_MS = 2600;
const FLIP_DOWN_MS = 600;
const GATHER_MS = 800;
const FAN_MS = 900;
const BACK_STEPS = 4;
const FLIP_GAP_MS = 400;
const FLIP_BACK_MS = 1200;

const CFG: Record<Difficulty, {
  cost: number; reward: number; moveMs: number; swaps: number;
  stepMs: number; steps: number; gather: boolean; backs: boolean;
}> = {
  easy: { cost: 10, reward: 3, moveMs: 1100, swaps: 1, stepMs: 1300, steps: 14, gather: false, backs: false },
  normal: { cost: 20, reward: 6, moveMs: 900, swaps: 4, stepMs: 1000, steps: 8, gather: false, backs: false },
  hard: { cost: 30, reward: 9, moveMs: 500, swaps: 6, stepMs: 620, steps: 10, gather: true, backs: true },
};

const identity = () => Array.from({ length: SIZE }, (_, i) => i);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function place(layout: Layout, slot: number) {
  if (layout === "deck") {
    return { left: `${42 + slot * 1.1}%`, top: `${5 + slot * 1.3}%`, zIndex: slot };
  }
  if (layout === "arc") {
    const t = ((180 + (180 * slot) / (SIZE - 1)) * Math.PI) / 180;
    return { left: `${50 + 36 * Math.cos(t)}%`, top: `${64 + 30 * Math.sin(t)}%`, zIndex: 1 };
  }
  return { left: `${(slot % 5) * 20 + 1}%`, top: `${Math.floor(slot / 5) * 50 + 2}%`, zIndex: 1 };
}

export default function Memory() {
  const { text } = useSession();
  const [diff, setDiff] = useState<Difficulty>("normal");
  const cfg = CFG[diff];

  const [phase, setPhase] = useState<"idle" | "preview" | "moving" | "playing" | "done">("idle");
  const [layout, setLayout] = useState<Layout>("grid");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [cards, setCards] = useState<number[]>([]);
  const [slots, setSlots] = useState<number[]>(identity());
  const [backs, setBacks] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<number[]>([]);
  const [guessesLeft, setGuessesLeft] = useState(0);
  const [pairsFound, setPairsFound] = useState(0);
  const [payout, setPayout] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  function swapStep() {
    setSlots((prev) => {
      const next = [...prev];
      const pool = next.map((_, i) => i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      for (let k = 0; k + 1 < pool.length && k / 2 < cfg.swaps; k += 2) {
        const a = pool[k], b = pool[k + 1];
        [next[a], next[b]] = [next[b], next[a]];
      }
      return next;
    });
  }

  function swapBacks() {
    setBacks((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }

  async function start() {
    setErr(null);
    try {
      const r = await api<{
        round: { id: string; deck: number[]; guessesLeft: number; backs: number[] };
      }>("/api/games/memory/start", { method: "POST", body: JSON.stringify({ difficulty: diff }) });

      setRoundId(r.round.id);
      setCards(r.round.deck);
      setSlots(identity());
      setBacks(r.round.backs.length ? r.round.backs : identity());
      setRevealed(new Set());
      setPending([]);
      setLayout("grid");
      setGuessesLeft(r.round.guessesLeft);
      setPairsFound(0);
      setPayout(0);
      setPhase("preview");

      await sleep(HOLD_MS);
      setPhase("moving");
      await sleep(FLIP_DOWN_MS);

      if (cfg.gather) {
        setLayout("deck");
        await sleep(GATHER_MS);
        setLayout("arc");
        await sleep(FAN_MS);
        for (let i = 0; i < BACK_STEPS; i++) {
          swapBacks();
          await sleep(cfg.stepMs);
        }
      }

      for (let i = 0; i < cfg.steps; i++) {
        swapStep();
        await sleep(cfg.stepMs);
      }

      setPhase("playing");
    } catch (e) {
      setErr((e as Error).message);
      setPhase("idle");
    }
  }

  async function resolve(a: number, b: number) {
    try {
      const r = await api<GuessRes>("/api/games/memory/guess", {
        method: "POST", body: JSON.stringify({ roundId, a, b }),
      });
      setGuessesLeft(r.guessesLeft);
      setPairsFound(r.pairsFound);
      setPayout(r.payout);
      if (r.matched) {
        setRevealed((p) => new Set([...p, a, b]));
        setPending([]);
      } else {
        setTimeout(() => setPending([]), FLIP_BACK_MS);
      }
      if (r.status !== "active") setPhase("done");
    } catch (e) {
      setErr((e as Error).message);
      setPending([]);
    }
  }

  function flip(id: number) {
    if (phase !== "playing" || revealed.has(id) || pending.includes(id) || pending.length === 2) return;
    if (pending.length === 0) return setPending([id]);
    const first = pending[0];
    setPending([first, id]);
    setTimeout(() => resolve(first, id), FLIP_GAP_MS);
  }

  const faceUp = (id: number) => phase === "preview" || revealed.has(id) || pending.includes(id);
  const deck = cards.length ? cards : identity();
  const pairs = SIZE / 2;
  const small = layout !== "grid";

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">{text.memoryTitle ?? "Memory"}</h1>
          <span className="text-sm text-neutral-400">{formatAmount(cfg.cost * 10_000)} gold</span>
        </div>

        {phase === "idle" && (
          <div className="flex gap-2">
            {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
              <button key={d} className={d === diff ? "" : "ghost"} onClick={() => setDiff(d)}>
                {CFG[d].cost} gold
              </button>
            ))}
          </div>
        )}

        <p className="text-sm text-neutral-400">{text.memoryIntro ?? ""}</p>
        <p className="text-sm text-neutral-500">
          {text.memoryPairs ?? "Pairs"} {pairsFound}/{pairs} ·{" "}
          {text.memoryGuessesLeft ?? "Guesses left"} {guessesLeft} ·{" "}
          {text.memoryWon ?? "Won"} {formatAmount(payout)}
        </p>

        {phase === "idle" && <button onClick={start}>{text.memoryStart ?? "Start round"}</button>}
        {phase === "preview" && <p className="text-xs text-amber-400">Memorise the board…</p>}
        {phase === "moving" && <p className="text-xs text-neutral-500">Shuffling…</p>}
        {phase === "done" && (
          <>
            <p className={`text-sm ${pairsFound >= pairs ? "text-emerald-400" : "text-red-400"}`}>
              {pairsFound >= pairs ? (text.memoryWin ?? "Board cleared.") : (text.memoryLose ?? "Out of guesses.")}{" "}
              {formatAmount(payout)} gold returned.
            </p>
            <button onClick={start}>{text.memoryAgain ?? "Play again"}</button>
          </>
        )}
        {err && <p className="text-sm text-red-400">{err}</p>}
      </div>

      <div className="mboard">
        {identity().map((id) => {
          const slot = slots.indexOf(id);
          const p = place(layout, slot);
          return (
            <button
              key={id}
              onClick={() => flip(id)}
              disabled={phase !== "playing" || revealed.has(id) || pending.includes(id)}
              style={{ left: p.left, top: p.top, zIndex: p.zIndex, transitionDuration: `${cfg.moveMs}ms` }}
              className={`mcard ${small ? "small" : ""} ${faceUp(id) ? "face-up" : ""} ${revealed.has(id) ? "matched" : ""}`}
              aria-label={`Card ${id + 1}`}
            >
              <span className="mcard-inner">
                <span
                  className="mcard-face back"
                  style={{ backgroundImage: `url(/cards/${cfg.backs ? `pair-back-${backs[id] ?? 0}` : "back"}.png)` }}
                />
                <span className="mcard-face front" style={{ backgroundImage: `url(/cards/face-${deck[id]}.png)` }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
