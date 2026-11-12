"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/Client";

export default function Page() {
  const [edge, setEdge] = useState<number | null>(null);
  useEffect(() => { api<{ games: { edgeBps: number }[] }>("/api/games").then((d) => setEdge(d.games[0]?.edgeBps ?? null)).catch(() => {}); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Games</h1>
      {edge !== null && <p className="text-sm text-neutral-400">House edge {(edge / 100).toFixed(2)}% on every table.</p>}
      <a href="/games/dice" className="card block hover:border-neutral-600">
        <h2 className="font-medium">Dice</h2>
        <p className="text-sm text-neutral-400">Pick your odds, roll under or over.</p>
      </a>
    </div>
  );
}