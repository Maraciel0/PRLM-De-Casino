import { db } from "./db";
import { siteText } from "./db/schema";

export const DEFAULT_TEXT: Record<string, string> = {
  eyebrow: "Parlamentum · gold only",
  title: "The House",
  intro: "A player-run dice hall. Deposit in-game gold, roll at published odds, withdraw whenever you like.",
  ctaLabel: "Get started",
  ctaHref: "/login",
  step1Title: "Create an account",
  step1Body: "Pick an in-game name and a password. You get a verification code to paste into your Parlamentum profile.",
  step2Title: "Deposit",
  step2Body: "Send gold in-game with your code in the memo, paste the transaction ID, and it is credited once confirmed.",
  step3Title: "Roll",
  step3Body: "Pick your odds on the dice table and play.",
  noteTitle: "How the house makes money",
  noteBody: "Every game pays slightly under true odds. That margin is how the house stays solvent.",
  footer: "In-game gold only. No real money changes hands.",
  labelHeld: "Gold held by the house",
  labelMinBet: "Minimum bet",
};

export async function getSiteText(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteText);
  const merged = { ...DEFAULT_TEXT };
  for (const r of rows) if (r.key in merged) merged[r.key] = r.value;
  return merged;
}
