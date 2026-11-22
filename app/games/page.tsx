"use client";
import { useEffect, useState } from "react";
import { api, useSession } from "@/components/Client";

export default function Page() {
  const { text } = useSession();
  const [live, setLive] = useState(false);
  useEffect(() => { api("/api/games").then(() => setLive(true)).catch(() => {}); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{text.gamesTitle ?? "Games"}</h1>
      <p className="text-sm text-neutral-400">{text.gamesIntro ?? ""}</p>
      {live && (
        <a href="/games/dice" className="card block hover:border-neutral-600">
          <h2 className="font-medium">{text.diceTitle ?? "Dice"}</h2>
        </a>
        <a href="/games/memory" className="card block hover:border-neutral-600">
          <h2 className="font-medium">{text.memoryTitle ?? "Memory"}</h2>
        </a>
      )}
    </div>
  );
}
