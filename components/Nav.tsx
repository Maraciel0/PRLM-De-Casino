"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "./Client";

const svg = (children: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const icons = {
  games: svg(<><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1" /><circle cx="15.5" cy="15.5" r="1" /><circle cx="12" cy="12" r="1" /></>),
  wallet: svg(<path d="M6 3h12l4 6-10 12L2 9z" />),
  profile: svg(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2" /></>),
  admin: svg(<><path d="M12 3v18M7 21h10M5 7h14" /><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" /></>),
  signin: svg(<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5M15 12H3" /></>),
};

function Brand({ name }: { name: string }) {
  return (
    <a href="/" className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-full border border-gold bg-ink text-gold shadow-[0_0_14px_-2px_rgba(217,167,40,0.6)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3 7 7 .6-5.3 4.6L18.4 21 12 17.2 5.6 21l1.7-6.8L2 9.6 9 9z" /></svg>
      </span>
      <span className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-[0.12em] text-gold-bright">{name}</span>
    </a>
  );
}

export default function Nav() {
  const { user, loading, text } = useSession();
  const path = usePathname() ?? "/";
  const brand = text.brand ?? "The House";

  if (loading) return <Brand name={brand} />;

  const links: { href: string; label: string; icon: ReactNode }[] = [
    { href: "/games", label: text.navGames ?? "Games", icon: icons.games },
    { href: "/wallet", label: text.navWallet ?? "Wallet", icon: icons.wallet },
    ...(user ? [{ href: "/profile", label: text.navProfile ?? "Profile", icon: icons.profile }] : []),
    ...(user?.role === "operator" ? [{ href: "/admin", label: text.navAdmin ?? "Admin", icon: icons.admin }] : []),
    ...(!user ? [{ href: "/login", label: text.navSignIn ?? "Sign in", icon: icons.signin }] : []),
  ];

  return (
    <>
      <Brand name={brand} />
      <nav className="gap-1">
        {links.map((l) => {
          const active = path === l.href || path.startsWith(l.href + "/");
          return (
            <a
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                active ? "text-gold-bright" : "text-neutral-400 hover:text-gold-bright"
              }`}
            >
              {l.icon}
              <span className="hidden font-[family-name:var(--font-display)] text-xs font-medium uppercase tracking-[0.12em] sm:inline">{l.label}</span>
              {active && (
                <span className="absolute inset-x-3 -bottom-[0.8rem] h-px bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_10px_1px_rgba(217,167,40,0.7)]" />
              )}
            </a>
          );
        })}
      </nav>
    </>
  );
}
