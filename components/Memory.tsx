"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
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
const ARC_W = 8;
const ARC_STEP = 9.5;
const ARC_RY = 46;
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

const LABEL: Record<Difficulty, string> = { easy: "Easy", normal: "Normal", hard: "Hard" };
const BLURB: Record<Difficulty, string> = {
  easy: "Slow, gentle shuffle",
  normal: "Faster swaps",
  hard: "Gather, fan out, swap backs",
};

const identity = () => Array.from({ length: SIZE }, (_, i) => i);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Small cards (deck pile and arc) are 13% x 34% of the board. Positions are the card's top-left,
// so subtract half a card to centre things on the board's midpoint.
const SMALL_W = 13;
const SMALL_H = 34;

function place(layout: Layout, slot: number) {
  const mid = (SIZE - 1) / 2;
  if (layout === "deck") {
    // A tidy pile centred on the board, fanned a little either side of the middle.
    return {
      left: `${(100 - SMALL_W) / 2 + (slot - mid) * 0.5}%`,
      top: `${(100 - SMALL_H) / 2 + (slot - mid) * 0.6}%`,
      zIndex: slot,
    };
  }
  if (layout === "arc") {
    // A shallow semi-circle: even horizontal spacing keeps every card clear of its neighbours.
    const left = (100 - ARC_W) / 2 + (slot - (SIZE - 1) / 2) * ARC_STEP;
    const u = (left + ARC_W / 2 - 50) / 46;
    const top = 54 - ARC_RY * Math.sqrt(Math.max(0, 1 - u * u));
    return { left: `${left}%`, top: `${top}%`, zIndex: 1 };
  }
  return { left: `${(slot % 5) * 20 + 1}%`, top: `${Math.floor(slot / 5) * 50 + 2}%`, zIndex: 1 };
}

export default function Memory() {
  const { text } = useSession();
  const [diff, setDiff] = useState<Difficulty>("normal");
  const cfg = CFG[diff];

  // Preload card art so nothing pops in mid-flip.
  useEffect(() => {
    ["back", "face-0", "face-1", "face-2", "face-3", "face-4",
      "pair-back-0", "pair-back-1", "pair-back-2", "pair-back-3", "pair-back-4"].forEach((n) => {
      const img = new Image();
      img.src = `/cards/${n}.png`;
    });
  }, []);

  const [phase, setPhase] = useState<"idle" | "preview" | "moving" | "playing" | "done">("idle");
  const [moveStage, setMoveStage] = useState<"cards" | "backs" | "sweep" | null>(null);
  const [layout, setLayout] = useState<Layout>("grid");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [cards, setCards] = useState<number[]>([]);
  const [slots, setSlots] = useState<number[]>(identity());
  const slotsRef = useRef<number[]>(identity());
  const [backs, setBacks] = useState<number[]>([]);
  const [backPos, setBackPos] = useState<number[]>(identity());
  const [floatBacks, setFloatBacks] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<number[]>([]);
  const [guessesLeft, setGuessesLeft] = useState(0);
  const [guessTotal, setGuessTotal] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [round, setRound] = useState(0);
  const [starting, setStarting] = useState(false);
  const [pairsFound, setPairsFound] = useState(0);
  const [payout, setPayout] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  function shufflePairs<T>(arr: T[]) {
    const next = [...arr];
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
  }

  function swapStep() {
    const next = shufflePairs(slotsRef.current);
    slotsRef.current = next;
    setSlots(next);
  }

  function swapFloatBacks() {
    setBackPos((prev) => shufflePairs(prev));
  }

  async function start() {
    setErr(null);
    setMoveStage(null);
    setStarting(true);
    try {
      const r = await api<{
        round: { id: string; deck: number[]; guessesLeft: number; backs: number[] };
      }>("/api/games/memory/start", { method: "POST", body: JSON.stringify({ difficulty: diff }) });

      setRoundId(r.round.id);
      setCards(r.round.deck);
      setSlots(identity());
      slotsRef.current = identity();
      setBackPos(identity());
      setFloatBacks(false);
      setBacks(r.round.backs.length ? r.round.backs : identity());
      setRevealed(new Set());
      setPending([]);
      setLayout("grid");
      setGuessesLeft(r.round.guessesLeft);
      setGuessTotal(r.round.guessesLeft);
      setWrong(false);
      setRound((n) => n + 1);
      setPairsFound(0);
      setPayout(0);
      setStarting(false);
      setPhase("preview");

      await sleep(HOLD_MS);
      setPhase("moving");
      await sleep(FLIP_DOWN_MS);

      if (cfg.gather) {
        // Phase 1: the cards shuffle around the standard 5 x 2 grid.
        setLayout("grid");
        setMoveStage("cards");
        for (let i = 0; i < cfg.steps; i++) {
          swapStep();
          await sleep(cfg.stepMs);
        }

        // Phase 2: the pair-backs detach and drift around separately from the cards.
        setMoveStage("backs");
        const home = () => Array.from({ length: SIZE }, (_, i) => slotsRef.current.indexOf(i));
        setBackPos(home());
        setFloatBacks(true);
        await sleep(cfg.stepMs);
        for (let i = 0; i < BACK_STEPS; i++) {
          swapFloatBacks();
          await sleep(cfg.stepMs);
        }
        // Bring the floating backs home to their cards before the final sweep.
        setBackPos(home());
        await sleep(cfg.stepMs);
        setFloatBacks(false);

        // Phase 3: the cards sweep into a non-overlapping semi-circle.
        setMoveStage("sweep");
        setLayout("arc");
        await sleep(FAN_MS);
      } else {
        for (let i = 0; i < cfg.steps; i++) {
          swapStep();
          await sleep(cfg.stepMs);
        }
      }

      setMoveStage(null);
      setPhase("playing");
    } catch (e) {
      setErr((e as Error).message);
      setMoveStage(null);
      setFloatBacks(false);
      setStarting(false);
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
        setWrong(true);
        setTimeout(() => { setPending([]); setWrong(false); }, FLIP_BACK_MS);
      }
      if (r.status !== "active") setPhase("done");
    } catch (e) {
      setErr((e as Error).message);
      setPending([]);
      setWrong(false);
    }
  }

  function flip(id: number) {
    if (phase !== "playing" || revealed.has(id) || pending.includes(id) || pending.length === 2) return;
    if (pending.length === 0) return setPending([id]);
    const first = pending[0];
    setPending([first, id]);
    setTimeout(() => resolve(first, id), FLIP_GAP_MS);
  }

  const backSrc = (id: number) =>
    cfg.backs && !floatBacks && backs.length ? `/cards/pair-back-${backs[id]}.png` : "/cards/back.png";
  const faceUp = (id: number) =>
    phase === "preview" || phase === "done" || revealed.has(id) || pending.includes(id);
  const deck = cards.length ? cards : identity();
  const pairs = SIZE / 2;
  const small = layout === "deck";
  const arcCard = layout === "arc";
  const won = pairsFound >= pairs;
  const canPlay = phase === "playing" && pending.length < 2;

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="eyebrow">{text.memoryEyebrow ?? "Parlamentum"}</p>
            <h1 className="text-2xl font-semibold">{text.memoryTitle ?? "Memory"}</h1>
          </div>
          <span className="pill">{formatAmount(cfg.cost * 10_000)} gold</span>
        </div>
        {text.memoryIntro && <p className="text-sm text-neutral-400">{text.memoryIntro}</p>}

        {(phase === "idle" || phase === "done") && (
          <div className="grid grid-cols-3 gap-2">
            {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
              <button key={d} className={`tier ${d === diff ? "on" : ""}`} onClick={() => setDiff(d)} aria-pressed={d === diff}>
                <span className="block font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-widest text-white">{LABEL[d]}</span>
                <span className="mt-0.5 block text-xs text-gold-bright">{CFG[d].cost} gold · {CFG[d].reward} / pair</span>
                <span className="mt-1 hidden text-[0.7rem] text-neutral-500 sm:block">{BLURB[d]}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="stat">
            <p className="stat-label">{text.memoryPairs ?? "Pairs"}</p>
            <p className="stat-value">{pairsFound}<span className="text-neutral-500">/{pairs}</span></p>
          </div>
          <div className="stat">
            <p className="stat-label">{text.memoryGuessesLeft ?? "Guesses left"}</p>
            {guessTotal > 0 ? (
              <div className="pips" aria-label={`${guessesLeft} guesses left`}>
                {Array.from({ length: guessTotal }, (_, i) => (
                  <span key={i} className={`pip ${i < guessesLeft ? "on" : ""}`} />
                ))}
              </div>
            ) : (
              <p className="stat-value text-neutral-500">–</p>
            )}
          </div>
          <div className="stat">
            <p className="stat-label">{text.memoryWon ?? "Won"}</p>
            <p className="stat-value gold">{formatAmount(payout)}</p>
          </div>
        </div>

        {phase !== "idle" && phase !== "done" && (
          <div className="space-y-2" aria-live="polite">
            <p className="text-sm font-medium text-gold-bright">
              {phase === "preview" ? (text.memoryMemorise ?? "Memorise the board")
                : phase === "moving"
                  ? moveStage === "cards" ? "Watch closely — cards shuffling"
                    : moveStage === "backs" ? "Now the card backs are moving"
                    : "Sweeping into position"
                : (text.memoryPick ?? "Pick two cards")}…
            </p>
            {phase === "preview" && (
              <div className="holdbar" style={{ "--hold": `${HOLD_MS}ms` } as CSSProperties}>
                <span key={round} />
              </div>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className={`mresult ${won ? "win" : "lose"}`} aria-live="polite">
            <p className={`text-sm font-medium ${won ? "text-gold-bright" : "text-red-300"}`}>
              {won ? (text.memoryWin ?? "Board cleared.") : (text.memoryLose ?? "Out of guesses.")}{" "}
              {formatAmount(payout)} gold returned.
            </p>
          </div>
        )}

        {(phase === "idle" || phase === "done") && (
          <button onClick={start} disabled={starting}>
            {starting ? "…" : phase === "idle" ? (text.memoryStart ?? "Start round") : (text.memoryAgain ?? "Play again")}
          </button>
        )}
        {err && <p className="text-sm text-red-400">{err}</p>}
      </div>

      <div className="mtable">
        <div className="mboard">
          {identity().map((id) => {
            const slot = slots.indexOf(id);
            const p = place(layout, slot);
            const isPending = pending.includes(id);
            return (
              <button
                key={id}
                onClick={() => flip(id)}
                disabled={!canPlay || revealed.has(id) || isPending}
                style={{ left: p.left, top: p.top, zIndex: p.zIndex, transitionDuration: `${cfg.moveMs}ms` }}
                className={[
                  "mcard",
                  small ? "small" : "",
                  arcCard ? "arc-card" : "",
                  faceUp(id) ? "face-up" : "",
                  revealed.has(id) ? "matched" : "",
                  phase === "done" && !revealed.has(id) ? "missed" : "",
                  wrong && isPending ? "wrong" : "",
                  canPlay && !revealed.has(id) && !isPending ? "playable" : "",
                ].join(" ")}
                aria-label={`Card ${id + 1}`}
              >
                <span className="mcard-inner">
                  <span
                    className="mcard-face back"
                    style={{ backgroundImage: `url(${backSrc(id)})` }}
                  />
                  <span className="mcard-face front" style={{ backgroundImage: `url(/cards/face-${deck[id]}.png)` }} />
                </span>
              </button>
            );
          })}
          {floatBacks && identity().map((i) => {
            const p = place("grid", backPos[i]);
            return (
              <span
                key={`float-${i}`}
                className="mfloat"
                style={{
                  left: p.left,
                  top: p.top,
                  zIndex: 20,
                  transitionDuration: `${cfg.moveMs}ms`,
                  backgroundImage: `url(/cards/pair-back-${backs[i]}.png)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
