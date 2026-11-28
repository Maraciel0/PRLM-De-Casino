import "./globals.css";
import type { Metadata } from "next";
import { Oswald, Barlow } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-oswald", display: "swap" });
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-barlow", display: "swap" });

export const metadata: Metadata = { title: "The Seville Casino", description: "Parlamentum Player-Run Casino" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${oswald.variable} ${barlow.variable}`}>
      <body>
        <header><Nav /></header>
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
