"use client";
import { useSession, api } from "./Client";
import { formatAmount } from "@/lib/money";

export default function Home() {
  const { loading, user, balance } = useSession();
  if (loading) return <p className="text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="card">
        <h1 className="text-lg font-semibold">The House</h1>
        {user?.linked ? (
          <p className="mt-1 text-sm text-neutral-400">Playing as <span className="text-neutral-100">{user.handle}</span></p>
        ) : (
          <p className="mt-1 text-sm text-neutral-400"><a className="underline" href="/link">Link your account</a> to start.</p>
        )}
        <p className="mt-5 text-3xl font-semibold tabular-nums">{formatAmount(balance)} <span className="text-sm text-neutral-500">gold</span></p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <a href="/games" className="card hover:border-neutral-600"><h2 className="font-medium">Games</h2><p className="text-sm text-neutral-400">Dice, live.</p></a>
        <a href="/wallet" className="card hover:border-neutral-600"><h2 className="font-medium">Wallet</h2><p className="text-sm text-neutral-400">Deposit and withdraw.</p></a>
      </div>
      {user?.role === "operator" && <a href="/admin" className="block text-sm text-amber-400 underline">Open operator console</a>}
      <button className="ghost" onClick={() => api("/api/auth/logout", { method: "POST" }).then(() => location.reload())}>Sign out</button>
    </div>
  );
}