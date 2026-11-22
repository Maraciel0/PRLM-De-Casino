"use client";
import { useState } from "react";
import { api, useSession } from "./Client";
import { formatAmount } from "@/lib/money";

type GuessRes = {
  values: [number, number]; matched: boolean; pairsFound: number;
  guessesLeft: number; payout: number; status: string; balance: number;
};

const HOLD_MS = 2600;
const FLIP_DOWN_MS = 600;
const SHUFFLE_STEP = 800;
const SHUFFLE_ROUNDS = 4;
const FLIP_GAP_MS = 400;
const FLIP_BACK_MS = 1200;
const SIZE = 10;

const identity = () => Array.from({ length: SIZE }, (_, i) => i);
const position = (slot: number) => ({
  left: `${(slot % 5) * 20 + 1}%`,
  top: `${Math.floor(slot / 5) * 50 + 2}%`,
});
const tilt = (id: number) => ((id * 37) % 11) - 5;

export default function Memory() {
  const { text } = useSession();
  const [phase, setPhase] = useState<
    "idle" | "preview" | "flipping" | "shuffling" | "playing" | "done"
  >("idle");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [cards, setCards] = useState<number[]>([]);
  const [slots, setSlots] = useState<number[]>(identity());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<number[]>([]);
  const [guessesLeft, setGuessesLeft] = useState(0);
  const [pairsFound, setPairsFound] = useState(0);
  const [payout, setPayout] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  function permute() {
    setSlots((prev) => {
      // Swap the two rows so every card crosses the board, then scramble.
      const next = [...prev.slice(5), ...prev.slice(0, 5)];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }

  function runShuffle(done: () => void) {
    setPhase("shuffling");
    let round = 0;
    const step = () => {
      permute();
      round++;
      if (round < SHUFFLE_ROUNDS) {
        setTimeout(step, SHUFFLE_STEP);
      } else {
        setTimeout(() => {
          setPhase("playing");
          done();
        }, SHUFFLE_STEP);
      }
    };
    step();
  }

  async function start() {
    setErr(null);
    try {
      const r = await api<{ round: { id: string; deck: number[]; guessesLeft: number } }>(
        "/api/games/memory/start", { method: "POST", body: "{}" },
      );
      setRoundId(r.round.id);
      setCards(r.round.deck);
      setSlots(identity());
      setRevealed(new Set());
      setPending([]);
      setGuessesLeft(r.round.guessesLeft);
      setPairsFound(0);
      setPayout(0);
      setPhase("preview");

      // Show the board, flip every card down, then shuffle face-down.
      setTimeout(() => {
        setPhase("flipping");
        setTimeout(() => runShuffle(() => {}), FLIP_DOWN_MS);
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
    if (pending.length === 0) {
      setPending([id]);
      return;
    }
    const first = pending[0];
    setPending([first, id]);
    setTimeout(() => resolve(first, id), FLIP_GAP_MS);
  }

  const faceUp = (id: number) => phase === "preview" || revealed.has(id) || pending.includes(id);

  const deck = cards.length ? cards : Array.from({ length: SIZE }, (_, i) => i);
  const pairs = deck.length / 2;

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">{text.memoryTitle ?? "Memory"}</h1>
          <span className="text-sm text-neutral-400">{formatAmount(20 * 10_000)} gold</span>
        </div>
        <p className="text-sm text-neutral-400">{text.memoryIntro ?? ""}</p>
        <p className="text-sm text-neutral-500">
          {text.memoryPairs ?? "Pairs"} {pairsFound}/{pairs} ·{" "}
          {text.memoryGuessesLeft ?? "Guesses left"} {guessesLeft} ·{" "}
          {text.memoryWon ?? "Won"} {formatAmount(payout)}
        </p>

        {phase === "idle" && <button onClick={start}>{text.memoryStart ?? "Start round"}</button>}
        {phase === "preview" && <p className="text-xs text-amber-400">Memorise the board…</p>}
        {(phase === "flipping" || phase === "shuffling") && (
          <p className="text-xs text-neutral-500">Shuffling…</p>
        )}
        {phase === "done" && (
          <>
            <p className={`text-sm ${pairsFound >= pairs ? "text-emerald-400" : "text-red-400"}`}>
              {pairsFound >= pairs
                ? (text.memoryWin ?? "Board cleared.")
                : (text.memoryLose ?? "Out of guesses.")}{" "}
              {formatAmount(payout)} gold returned.
            </p>
            <button onClick={start}>{text.memoryAgain ?? "Play again"}</button>
          </>
        )}
        {err && <p className="text-sm text-red-400">{err}</p>}
      </div>

      <div className="mboard">
        {slots.map((id, slot) => (
          <button
            key={id}
            onClick={() => flip(id)}
            disabled={phase !== "playing" || revealed.has(id) || pending.includes(id)}
            style={{
              ...position(slot),
              transform: phase === "shuffling" ? `rotate(${tilt(id)}deg)` : "rotate(0deg)",
            }}
            className={`mcard ${faceUp(id) ? "face-up" : ""} ${revealed.has(id) ? "matched" : ""}`}
            aria-label={`Card ${id + 1}`}
          >
            <span className="mcard-inner">
              <span className="mcard-face back" style={{ backgroundImage: "url(/cards/back.png)" }} />
              <span className="mcard-face front" style={{ backgroundImage: `url(/cards/face-${deck[id]}.png)` }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
