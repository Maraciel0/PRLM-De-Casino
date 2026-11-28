"use client";
import { useSession, api } from "./Client";
import { formatAmount } from "@/lib/money";

export default function Home() {
  const { loading, user, balance, text } = useSession();
  if (loading) return <p className="text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="card">
        <p className="eyebrow">{text.title ?? "The Atlantic Casino"}</p>
        {user && (
          <p className="mt-1 text-sm text-neutral-400">
            {text.homeGreeting ?? "Playing as"} <span className="text-gold-bright">{user.handle}</span>
          </p>
        )}
        <p className="stat-label mt-5">Balance</p>
        <p className="font-[family-name:var(--font-display)] text-5xl font-bold tabular-nums text-white">
          {formatAmount(balance)} <span className="text-base font-medium tracking-widest text-gold">GOLD</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href="/games" className="card card-link">
          <h2 className="font-medium">{text.homeGamesTitle ?? "Games"}</h2>
          <p className="text-sm text-neutral-400">{text.homeGamesBody ?? "Dice, live."}</p>
        </a>
        <a href="/wallet" className="card card-link">
          <h2 className="font-medium">{text.homeWalletTitle ?? "Wallet"}</h2>
          <p className="text-sm text-neutral-400">{text.homeWalletBody ?? "Deposit and withdraw."}</p>
        </a>
      </div>

      {user?.role === "operator" && (
        <a href="/admin" className="block text-sm text-gold-bright hover:underline">
          {text.homeAdminLink ?? "Open operator console"}
        </a>
      )}

      <button className="ghost" onClick={() => api("/api/auth/logout", { method: "POST" }).then(() => location.reload())}>
        {text.homeSignOut ?? "Sign out"}
      </button>
    </div>
  );
}
