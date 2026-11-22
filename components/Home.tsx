"use client";
import { useSession, api } from "./Client";
import { formatAmount } from "@/lib/money";

export default function Home() {
  const { loading, user, balance, text } = useSession();
  if (loading) return <p className="text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="card">
        <h1 className="text-lg font-semibold">{text.title ?? "The House"}</h1>
        {user && (
          <p className="mt-1 text-sm text-neutral-400">
            {text.homeGreeting ?? "Playing as"} <span className="text-neutral-100">{user.handle}</span>
          </p>
        )}
        <p className="mt-5 text-3xl font-semibold tabular-nums">
          {formatAmount(balance)} <span className="text-sm text-neutral-500">gold</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href="/games" className="card hover:border-neutral-600">
          <h2 className="font-medium">{text.homeGamesTitle ?? "Games"}</h2>
          <p className="text-sm text-neutral-400">{text.homeGamesBody ?? "Dice, live."}</p>
        </a>
        <a href="/wallet" className="card hover:border-neutral-600">
          <h2 className="font-medium">{text.homeWalletTitle ?? "Wallet"}</h2>
          <p className="text-sm text-neutral-400">{text.homeWalletBody ?? "Deposit and withdraw."}</p>
        </a>
      </div>

      {user?.role === "operator" && (
        <a href="/admin" className="block text-sm text-amber-400 underline">
          {text.homeAdminLink ?? "Open operator console"}
        </a>
      )}

      <button className="ghost" onClick={() => api("/api/auth/logout", { method: "POST" }).then(() => location.reload())}>
        {text.homeSignOut ?? "Sign out"}
      </button>
    </div>
  );
}
