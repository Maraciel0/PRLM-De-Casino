"use client";
import { useState } from "react";
import { api, useSession } from "./Client";
import { formatAmount } from "@/lib/money";

type GuessRes = {
  values: [number, number]; matched: boolean; pairsFound: number;
  guessesLeft: number; payout: number; status: string; balance: number;
};

const SHUFFLE_MS = 700;
const randomTransform = () => ({
  transform: `translate(${(Math.random() - 0.5) * 140}px, ${(Math.random() - 0.5) * 80}px) rotate(${(Math.random() - 0.5) * 50}deg)`,
});

export default function Memory() {
  const { text } = useSession();
  const [phase, setPhase] = useState<"idle" | "preview" | "shuffling" | "playing" | "done">("idle");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [cards, setCards] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<number[]>([]);
  const [offsets, setOffsets] = useState<Record<number, React.CSSProperties>>({});
  const [guessesLeft, setGuessesLeft] = useState(0);
  const [pairsFound, setPairsFound] = useState(0);
  const [payout, setPayout] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  function scatter() {
    const next: Record<number, React.CSSProperties> = {};
    for (let i = 0; i < 10; i++) next[i] = randomTransform();
    setOffsets(next);
  }

  async function start() {
    setErr(null);
    try {
      const r = await api<{ round: { id: string; deck: number[]; guessesLeft: number } }>(
        "/api/games/memory/start", { method: "POST", body: "{}" },
      );
      setRoundId(r.round.id);
      setCards(r.round.deck);
      setRevealed(new Set());
      setPending([]);
      setOffsets({});
      setGuessesLeft(r.round.guessesLeft);
      setPairsFound(0);
      setPayout(0);
      setPhase("preview");

      setTimeout(() => {
        scatter();
        setTimeout(() => {
          setPhase("shuffling");
          setOffsets({});
          setTimeout(() => setPhase("playing"), SHUFFLE_MS);
        }, SHUFFLE_MS);
      }, 1400);
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
        setTimeout(() => setPending([]), 900);
      }

      if (r.status !== "active") setPhase("done");
    } catch (e) {
      setErr((e as Error).message);
      setPending([]);
    }
  }

  function flip(i: number) {
    if (phase !== "playing" || revealed.has(i) || pending.includes(i) || pending.length === 2) return;
    const next = [...pending, i];
    setPending(next);
    if (next.length === 2) resolve(next[0], next[1]);
  }

  const faceUp = (i: number) => phase === "preview" || revealed.has(i) || pending.includes(i);
  const deckSize = cards.length || 10;

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">{text.memoryTitle ?? "Memory"}</h1>
          <span className="text-sm text-neutral-400">{formatAmount(20 * 10_000)} gold</span>
        </div>
        <p className="text-sm text-neutral-400">{text.memoryIntro ?? ""}</p>
        <p className="text-sm text-neutral-500">
          {text.memoryPairs ?? "Pairs"} {pairsFound}/{deckSize / 2} ·{" "}
          {text.memoryGuessesLeft ?? "Guesses left"} {guessesLeft} ·{" "}
          {text.memoryWon ?? "Won"} {formatAmount(payout)}
        </p>

        {phase === "idle" && <button onClick={start}>{text.memoryStart ?? "Start round"}</button>}
        {phase === "preview" && <p className="text-xs text-amber-400">Memorise the board…</p>}
        {phase === "shuffling" && <p className="text-xs text-neutral-500">Shuffling…</p>}
        {phase === "done" && (
          <>
            <p className={`text-sm ${pairsFound >= deckSize / 2 ? "text-emerald-400" : "text-red-400"}`}>
              {pairsFound >= deckSize / 2
                ? (text.memoryWin ?? "Board cleared.")
                : (text.memoryLose ?? "Out of guesses.")}{" "}
              {formatAmount(payout)} gold returned.
            </p>
            <button onClick={start}>{text.memoryAgain ?? "Play again"}</button>
          </>
        )}
        {err && <p className="text-sm text-red-400">{err}</p>}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {(cards.length ? cards : Array.from({ length: 10 })).map((v, i) => (
          <button
            key={i}
            onClick={() => flip(i)}
            disabled={phase !== "playing" || revealed.has(i) || pending.includes(i)}
            style={offsets[i]}
            className={`mcard ${faceUp(i) ? "face-up" : ""} ${revealed.has(i) ? "matched" : ""} ${offsets[i] ? "shuffling" : ""}`}
            aria-label={`Card ${i + 1}`}
          >
            <span className="mcard-inner">
              <span className="mcard-face back" style={{ backgroundImage: "url(/cards/back.png)" }} />
              <span className="mcard-face front" style={{ backgroundImage: `url(/cards/face-${v}.png)` }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
