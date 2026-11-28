"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, useSession } from "./Client";
import { formatAmount, parseAmount, SCALE } from "@/lib/money";
import { handValue, isBlackjack, rankOf, suitOf, isRed, RANK_LABELS, SUIT_SYMBOLS, type BjResult } from "@/lib/blackjack";

type Round = {
  id: string; bet: number; doubled: boolean; status: "active" | "settled"; result: BjResult | null;
  payout: number; player: number[]; dealer: number[]; holeHidden: boolean; canDouble: boolean; balance: number;
};
type Info = { paused: boolean; minBet: number; maxBet: number; current: Round | null };

const DEAL_STEP_MS = 420;
const CHIPS = [1, 5, 10, 25];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function PlayingCard({ card, hidden, delay = 0 }: { card: number | null; hidden?: boolean; delay?: number }) {
  const face = card === null ? null : { rank: RANK_LABELS[rankOf(card)], suit: SUIT_SYMBOLS[suitOf(card)], red: isRed(card) };
  return (
    <div className={`pcard ${hidden || !face ? "hidden" : ""}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="pcard-inner">
        <div className="pcard-back" />
        <div className={`pcard-face ${face?.red ? "red" : ""}`}>
          {face && (
            <>
              <span className="corner"><span>{face.rank}</span><span>{face.suit}</span></span>
              <span className="pip-big" aria-hidden="true">{face.suit}</span>
              <span className="corner flip"><span>{face.rank}</span><span>{face.suit}</span></span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Total({ cards }: { cards: number[] }) {
  if (!cards.length) return null;
  const shown = cards;
  const { total, soft } = handValue(shown);
  const bust = total > 21;
  const bj = isBlackjack(cards);
  return (
    <span className={`total-badge ${bust ? "bust" : ""} ${bj ? "bj" : ""}`}>
      {bj ? "Blackjack" : bust ? `Bust ${total}` : `${soft && shown.length > 1 && total < 21 ? "Soft " : ""}${total}`}
    </span>
  );
}

const RESULT_TEXT: Record<BjResult, string> = {
  blackjack: "Blackjack! Pays 3 to 2.",
  win: "You win.",
  push: "Push — your bet is returned.",
  lose: "Dealer wins.",
  bust: "Bust.",
};

export default function Blackjack() {
  const { loading, user, balance: sessionBalance, text } = useSession();
  const [info, setInfo] = useState<Info | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [dealerShown, setDealerShown] = useState(0);   // dealer cards currently visible
  const [resolved, setResolved] = useState(true);       // false while the dealer is still drawing
  const [bet, setBet] = useState("5");
  const [bal, setBal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastBet, setLastBet] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => { if (!loading) setBal(sessionBalance); }, [loading, sessionBalance]);

  useEffect(() => {
    api<Info>("/api/games/blackjack")
      .then((d) => {
        setInfo(d);
        if (d.current) {
          setRound(d.current);
          setDealerShown(d.current.dealer.length);
          setResolved(false);
          setBal(d.current.balance);
        }
      })
      .catch(() => {});
  }, []);

  /** Show a new server state. Dealer cards are revealed one at a time so the draw reads like a real table. */
  const present = useCallback(async (r: Round, prevDealerCount: number) => {
    const my = ++seq.current;
    setRound(r);
    setBal(r.balance);
    if (r.status === "active") { setDealerShown(r.dealer.length); setResolved(false); return; }
    setResolved(false);
    setDealerShown(Math.max(prevDealerCount, 1));
    await sleep(350);
    for (let n = Math.max(prevDealerCount, 1) + 1; n <= r.dealer.length; n++) {
      if (seq.current !== my) return;
      await sleep(DEAL_STEP_MS + (n > 2 ? 150 : 0));
      setDealerShown(n);
    }
    if (seq.current === my) setResolved(true);
  }, []);

  const deal = useCallback(async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await api<{ round: Round }>("/api/games/blackjack/start", { method: "POST", body: JSON.stringify({ bet }) });
      setLastBet(bet);
      setRound(null);
      await sleep(60);
      await present(r.round, 1);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [bet, busy, present]);

  const act = useCallback(async (move: "hit" | "stand" | "double") => {
    if (busy || !round || round.status !== "active") return;
    setBusy(true); setErr(null);
    try {
      const r = await api<{ round: Round }>("/api/games/blackjack/act", {
        method: "POST", body: JSON.stringify({ roundId: round.id, action: move }),
      });
      await present(r.round, 1);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [busy, round, present]);

  // Keyboard: H hit, S stand, D double, Enter / Space deal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const k = e.key.toLowerCase();
      if (round?.status === "active") {
        if (k === "h") act("hit");
        else if (k === "s") act("stand");
        else if (k === "d" && round.canDouble) act("double");
      } else if (k === "enter" && resolved && t?.tagName !== "BUTTON") deal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, resolved, act, deal]);

  if (loading) return <p className="text-neutral-500">Loading…</p>;
  if (!user) {
    return <p>Not signed in. <a className="underline" href="/login">{text.loginSignIn ?? "Sign in"}</a></p>;
  }

  const active = round?.status === "active";
  const settled = round?.status === "settled" && resolved;
  // Dealer slots keep a stable position so the hole card flips in place instead of being replaced.
  const dealerSlots: { card: number | null; hidden: boolean }[] = [];
  if (round) {
    if (active) {
      dealerSlots.push({ card: round.dealer[0], hidden: false }, { card: null, hidden: true });
    } else {
      const count = Math.max(dealerShown, Math.min(2, round.dealer.length));
      for (let i = 0; i < count; i++) dealerSlots.push({ card: round.dealer[i], hidden: i >= dealerShown });
    }
  }
  const dealerCards = round ? (active ? round.dealer.slice(0, 1) : round.dealer.slice(0, dealerShown)) : [];
  const minBet = info?.minBet ?? SCALE;
  const maxBet = info?.maxBet ?? 0;

  let betUnits = 0;
  try { betUnits = parseAmount(bet); } catch { betUnits = 0; }
  const betOk = betUnits >= minBet && (!maxBet || betUnits <= maxBet) && betUnits <= bal;

  const setChip = (g: number) => setBet(String(g));
  const adjust = (f: number) => {
    const v = Math.max(minBet, Math.min(maxBet || Infinity, Math.floor(betUnits * f)));
    setBet(formatAmount(v));
  };

  const net = round && settled ? round.payout - round.bet * (round.doubled ? 2 : 1) : 0;
  const tone = round?.result === "blackjack" || round?.result === "win" ? "win" : round?.result === "push" ? "push" : "lose";

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="eyebrow">{text.blackjackEyebrow ?? "Parlamentum"}</p>
            <h1 className="text-2xl font-semibold">{text.blackjackTitle ?? "Blackjack"}</h1>
          </div>
          <div className="stat text-right">
            <p className="stat-label">Balance</p>
            <p className="stat-value gold">{formatAmount(bal)}</p>
          </div>
        </div>
        <p className="text-sm text-neutral-400">
          Dealer stands on every 17. Blackjack pays 3 to 2. Double down on your first two cards. No splitting.
        </p>
        {info?.paused && <p className="text-sm text-red-400">The tables are paused by the house.</p>}
      </div>

      <div className="bjtable">
        {/* Dealer */}
        <div className="text-center">
          <p className="stat-label mb-1">Dealer</p>
          <div className="bjrow">
            <div className="bjhand">
              {round
                ? dealerSlots.map((c, i) => (
                    <PlayingCard key={`d${round.id}${i}`} card={c.card} hidden={c.hidden} delay={i === 1 ? 240 : i * 120} />
                  ))
                : <PlayingCard card={null} hidden />}
            </div>
          </div>
          <div className="mt-2 h-7">
            {round && <Total cards={dealerCards} />}
          </div>
        </div>

        <div className="my-3 flex items-center justify-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-dim to-transparent" />
          {round ? (
            <span className="betstack">{formatAmount(round.bet * (round.doubled ? 2 : 1))} gold</span>
          ) : (
            <span className="betstack">{betOk ? `${bet} gold` : "Place your bet"}</span>
          )}
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-dim to-transparent" />
        </div>

        {/* Player */}
        <div className="text-center">
          <div className="mb-2 h-7">{round && <Total cards={round.player} />}</div>
          <div className="bjrow">
            <div className="bjhand">
              {round
                ? round.player.map((c, i) => <PlayingCard key={`p${round.id}${i}`} card={c} delay={i === 1 ? 240 : i * 120} />)
                : <PlayingCard card={null} hidden />}
            </div>
          </div>
          <p className="stat-label mt-1">{user.handle ?? "You"}</p>
        </div>

        {/* Result */}
        {settled && round?.result && (
          <div className={`mresult ${tone} mx-auto mt-4 max-w-md text-center`} aria-live="polite">
            <p className={`font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-widest ${tone === "win" ? "text-gold-bright" : tone === "push" ? "text-neutral-200" : "text-red-300"}`}>
              {RESULT_TEXT[round.result]}
            </p>
            <p className="mt-0.5 text-sm text-neutral-400">
              {net > 0 ? `+${formatAmount(net)} gold` : net < 0 ? `${formatAmount(net)} gold` : "No change"}
            </p>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        {active ? (
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => act("hit")} disabled={busy}>Hit<kbd>H</kbd></button>
            <button className="ghost" onClick={() => act("stand")} disabled={busy}>Stand<kbd>S</kbd></button>
            <button className="ghost" onClick={() => act("double")} disabled={busy || !round?.canDouble}>Double<kbd>D</kbd></button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {CHIPS.map((g) => (
                <button key={g} className="chip" onClick={() => setChip(g)} disabled={busy || !resolved} aria-label={`Bet ${g}`}>{g}</button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <button className="ghost px-3" onClick={() => adjust(0.5)} disabled={busy || !resolved}>½</button>
                <button className="ghost px-3" onClick={() => adjust(2)} disabled={busy || !resolved}>2×</button>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                inputMode="decimal"
                placeholder="Bet"
                aria-label="Bet amount"
                disabled={!resolved}
              />
              <button onClick={deal} disabled={busy || !resolved || !betOk || info?.paused}>
                {busy ? "…" : round ? (text.blackjackAgain ?? "Deal again") : (text.blackjackDeal ?? "Deal")}
                <kbd>↵</kbd>
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Min {formatAmount(minBet)} · Max {maxBet ? formatAmount(maxBet) : "…"} gold
              {lastBet && round ? ` · last bet ${lastBet}` : ""}
            </p>
          </>
        )}
        {err && <p className="text-sm text-red-400">{err}</p>}
      </div>
    </div>
  );
}
