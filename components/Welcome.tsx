import { getSiteText } from "@/lib/site-text";
import { getSettings } from "@/lib/settings";
import { getTreasury } from "@/lib/liability";
import { formatAmount } from "@/lib/money";

export default async function Welcome() {
  const [t, s, held] = await Promise.all([getSiteText(), getSettings(), getTreasury()]);

  return (
    <div className="space-y-8">
      <section className="space-y-3 pt-6">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="text-5xl font-bold">{t.title}</h1>
        <p className="max-w-xl text-neutral-400">{t.intro}</p>
        <a href={t.ctaHref}>
          <button className="mt-2">{t.ctaLabel}</button>
        </a>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card">
          <p className="stat-label">{t.labelHeld}</p>
          <p className="stat-value gold mt-1">{formatAmount(held)}</p>
        </div>
        <div className="card">
          <p className="stat-label">{t.labelMinBet}</p>
          <p className="stat-value gold mt-1">{formatAmount(s.minBet)}</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-gold">0{i}</p>
            <h2 className="mt-1 font-medium">{t[`step${i}Title`]}</h2>
            <p className="mt-1 text-sm text-neutral-400">{t[`step${i}Body`]}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="font-medium">{t.noteTitle}</h2>
        <p className="mt-1 text-sm text-neutral-400">{t.noteBody}</p>
      </section>

      <p className="pb-6 text-xs text-neutral-500">{t.footer}</p>
    </div>
  );
}
