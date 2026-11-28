"use client";
import { useEffect, useState } from "react";
import { api, useSession } from "@/components/Client";

export default function Page() {
  const { text } = useSession();
  const [live, setLive] = useState(false);

  useEffect(() => {
    api("/api/games").then(() => setLive(true)).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Parlamentum</p><h1 className="text-2xl font-semibold">{text.gamesTitle ?? "Games"}</h1></div>
      <p className="text-sm text-neutral-400">{text.gamesIntro ?? ""}</p>

      {live && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <a href="/games/dice" className="card card-link block">
              <span className="pill">Live</span>
              <h2 className="mt-3 text-xl font-semibold">{text.diceTitle ?? "Dice"}</h2>
              <p className="mt-1 text-sm text-neutral-400">Pick your odds, roll under or over.</p>
            </a>
            <a href="/games/blackjack" className="card card-link block">
              <span className="pill">Live</span>
              <h2 className="mt-3 text-xl font-semibold">{text.blackjackTitle ?? "Blackjack"}</h2>
              <p className="mt-1 text-sm text-neutral-400">Beat the dealer to 21. Blackjack pays 3 to 2.</p>
            </a>
            <a href="/games/memory" className="card card-link block">
              <span className="pill">Live</span>
              <h2 className="mt-3 text-xl font-semibold">{text.memoryTitle ?? "Memory"}</h2>
              <p className="mt-1 text-sm text-neutral-400">Memorise the cards, survive the shuffle.</p>
            </a>
          </div>
        </>
      )}
    </div>
  );
}
