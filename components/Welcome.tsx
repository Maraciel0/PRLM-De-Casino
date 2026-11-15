import { welcome } from "@/content/welcome";
import { getSettings } from "@/lib/settings";
import { getTreasury } from "@/lib/liability";
import { formatAmount } from "@/lib/money";

export default async function Welcome() {
  const [s, held] = await Promise.all([getSettings(), getTreasury()]);

  return (
    <div className="space-y-8">
      <section className="space-y-3 pt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{welcome.eyebrow}</p>
        <h1 className="text-4xl font-semibold tracking-tight">{welcome.title}</h1>
        <p className="max-w-xl text-neutral-400">{welcome.intro}</p>
        <a href={welcome.ctaHref}>
          <button className="mt-2">{welcome.cta}</button>
        </a>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs text-neutral-500">{welcome.statsLabels.held}</p>
          <p className="mt-1 text-xl tabular-nums">{formatAmount(held)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-neutral-500">{welcome.statsLabels.edge}</p>
          <p className="mt-1 text-xl tabular-nums">{(s.houseEdgeBps / 100).toFixed(2)}%</p>
        </div>
        <div className="card">
          <p className="text-xs text-neutral-500">{welcome.statsLabels.minBet}</p>
          <p className="mt-1 text-xl tabular-nums">{formatAmount(s.minBet)}</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {welcome.steps.map((step, i) => (
          <div key={step.title} className="card">
            <p className="text-xs text-neutral-600">{String(i + 1).padStart(2, "0")}</p>
            <h2 className="mt-1 font-medium">{step.title}</h2>
            <p className="mt-1 text-sm text-neutral-400">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="font-medium">Fair by default</h2>
        <p className="mt-1 text-sm text-neutral-400">{welcome.fairNote}</p>
        <a href="/fair" className="mt-2 inline-block text-sm underline">See the seed history</a>
      </section>

      <p className="pb-6 text-xs text-neutral-600">{welcome.footer}</p>
    </div>
  );
}
