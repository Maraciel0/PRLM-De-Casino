import { getSiteText } from "@/lib/site-text";
import { getSettings } from "@/lib/settings";
import { getTreasury } from "@/lib/liability";
import { getActiveAnnouncements } from "@/lib/announcements";
import { formatAmount } from "@/lib/money";

export default async function Welcome() {
  const [t, s, held, notices] = await Promise.all([
    getSiteText(), getSettings(), getTreasury(), getActiveAnnouncements(),
  ]);

  return (
    <div className="space-y-8">
      {notices.length > 0 && (
        <section className="space-y-2">
          {notices.map((n) => (
            <div key={n.id} className="card border-amber-900/60 bg-amber-950/20">
              <p className="text-xs text-amber-500">Notice</p>
              <p className="mt-1 text-sm">{n.body}</p>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3 pt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.eyebrow}</p>
        <h1 className="text-4xl font-semibold tracking-tight">{t.title}</h1>
        <p className="max-w-xl text-neutral-400">{t.intro}</p>
        <a href={t.ctaHref}><button className="mt-2">{t.ctaLabel}</button></a>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card"><p className="text-xs text-neutral-500">{t.labelHeld}</p><p className="mt-1 text-xl tabular-nums">{formatAmount(held)}</p></div>
        <div className="card"><p className="text-xs text-neutral-500">{t.labelMinBet}</p><p className="mt-1 text-xl tabular-nums">{formatAmount(s.minBet)}</p></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            <p className="text-xs text-neutral-600">0{i}</p>
            <h2 className="mt-1 font-medium">{t[`step${i}Title`]}</h2>
            <p className="mt-1 text-sm text-neutral-400">{t[`step${i}Body`]}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="font-medium">{t.noteTitle}</h2>
        <p className="mt-1 text-sm text-neutral-400">{t.noteBody}</p>
      </section>

      <p className="pb-6 text-xs text-neutral-600">{t.footer}</p>
    </div>
  );
}
