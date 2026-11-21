import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = { title: "The House", description: "Parlamentum dice hall" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <a href="/" className="font-semibold">THE HOUSE</a>
          <Nav />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
