"use client";
import { useState } from "react";
import { api, useSession } from "./Client";
import { formatAmount } from "@/lib/money";

type Difficulty = "easy" | "normal" | "hard";
type GuessRes = {
  values: [number, number]; matched: boolean; pairsFound: number;
  guessesLeft: number; payout: number; status: string; balance: number;
};

const SIZE = 10;
const HOLD_MS = 2600;
const FLIP_DOWN_MS = 600;
const FLIP_GAP_MS = 400;
const FLIP_BACK_MS = 1200;

const CFG: Record<Difficulty, { cost: number; moveMs: number; swaps: number; stepMs: number; steps: number; gather: boolean; backs: boolean }> = {
  easy: { cost: 10, moveMs: 1100, swaps: 1, stepMs: 1300, steps: 12, gather: false, backs: false },
  normal: { cost: 20, moveMs: 900, swaps: 4, stepMs: 1000, steps: 8, gather: false, backs: false },
  hard: { cost: 30, moveMs: 500, swaps: 6, stepMs: 620, steps: 10, gather: true, backs: true },
};

const identity = () => Array.from({ length: SIZE }, (_, i) => i);
const grid = (slot: number) => ({
  left: `${(slot % 5) * 20 + 1}%`,
  top: `${Math.floor(slot / 5) * 50 + 2}%`,
  opacity: 1,
});

export default function Memory() {
  const { text } = useSession();
  const [diff, setDiff] = useState<Difficulty>("normal");
  const cfg = CFG[diff];

  const [phase, setPhase] = useState<"idle" | "preview" | "moving" | "playing" | "done">("idle");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [cards, setCards] = useState<number[]>([]);
  const [slots, setSlots] = useState<number[]>(identity());
  const [backs, setBacks] = useState<number[]>(identity().slice(0, 5));
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<number[]>([]);
  const [guessesLeft, setGuessesLeft] = useState(0);
  const [pairsFound, setPairsFound] = useState(0);
  const [payout, setPayout] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const slotOf = (id: number) => slots.indexOf(id);

  function step() {
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
    if (cfg.backs) {
      setBacks((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [next[i], next[j]] = [next[j], next[i]];
        }
        return next;
      });
    }
  }

  function runMoves(steps: number, done: () => void) {
    setPhase("moving");
    let n = 0;
    const tick = () => {
      step();
      n++;
      if (n < steps) setTimeout(tick, cfg.stepMs);
      else setTimeout(done, cfg.stepMs);
    };
    tick();
  }

  async function start() {
    setErr(null);
    try {
      const r = await api<{
        round: { id: string; deck: number[]; guessesLeft: number; backs: number[]; phase: string; stepsLeft: number };
      }>("/api/games/memory/start", { method: "POST", body: JSON.stringify({ difficulty: diff }) });

      setRoundId(r.round.id);
      setCards(r.round.deck);
      setSlots(identity());
      setBacks(r.round.backs.length ? r.round.backs : identity().slice(0, 5));
      setRevealed(new Set());
      setPending([]);
      setGuessesLeft(r.round.guessesLeft);
      setPairsFound(0);
      setPayout(0);
      setPhase("preview");

      setTimeout(() => {
        setPhase("moving");
        if (cfg.gather) {
          // Gather: every card collapses toward the deck position, then fans.
          setTimeout(() => runMoves(cfg.steps, () => {}), 700);
        } else {
          setTimeout(() => runMoves(cfg.steps, () => {}), FLIP_DOWN_MS);
        }
      }, HOLD_MS);
    } catch (e) {
      setErr((e as Error).message);
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
          const slot = slotOf(id);
          return (
            <button
              key={id}
              onClick={() => flip(id)}
              disabled={phase !== "playing" || revealed.has(id) || pending.includes(id)}
              style={{ ...grid(slot), transitionDuration: `${cfg.moveMs}ms` }}
              className={`mcard ${faceUp(id) ? "face-up" : ""} ${revealed.has(id) ? "matched" : ""}`}
              aria-label={`Card ${id + 1}`}
            >
              <span className="mcard-inner">
                <span
                  className="mcard-face back"
                  style={{ backgroundImage: `url(/cards/${cfg.backs ? `pair-back-${backs[deck[id]]}` : "back"}.png)` }}
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
