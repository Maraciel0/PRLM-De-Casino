import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = { title: "The House", description: "Parlamentum casino" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <a href="/" className="font-semibold">THE HOUSE</a>
          <nav>
            <a href="/games">Games</a>
            <a href="/wallet">Wallet</a>
            <a href="/fair">Fairness</a>
            <a href="/admin">Admin</a>
          </nav>
        </header>
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  );
}