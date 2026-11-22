import { db } from "./db";
import { siteText } from "./db/schema";

export const DEFAULT_TEXT: Record<string, string> = {
  brand: "The House",
  navGames: "Games",
  navWallet: "Wallet",
  navProfile: "Profile",
  navAdmin: "Admin",
  navSignIn: "Sign in",

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

  homeGreeting: "Playing as",
  homeSignOut: "Sign out",
  homeGamesTitle: "Games",
  homeGamesBody: "Dice, live.",
  homeWalletTitle: "Wallet",
  homeWalletBody: "Deposit and withdraw.",
  homeAdminLink: "Open operator console",

  walletTitle: "Wallet",
  walletAmountPlaceholder: "Amount",
  walletTxPlaceholder: "In-game transaction ID (deposits only)",
  walletDeposit: "Deposit",
  walletWithdraw: "Withdraw",
  walletHistory: "History",
  walletEmpty: "Nothing yet.",

  gamesTitle: "Games",
  gamesIntro: "Every table pays slightly under true odds. That margin keeps the house solvent.",

  diceTitle: "Dice",
  diceRoll: "Roll",
  diceLastRolls: "Last rolls",
  diceNoRolls: "No rolls yet.",

  loginIntro: "Use your exact in-game name. Passwords need at least 10 characters.",
  loginSignIn: "Sign in",
  loginCreate: "Create account",

  profileTitle: "Your account",
  profileCodeTitle: "Verification code",
  profileCodeBody: "Put this in your Parlamentum profile so the house can match your deposits to you.",
  profileChangeTitle: "Change password",
};

export async function getSiteText(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteText);
  const merged = { ...DEFAULT_TEXT };
  for (const r of rows) if (r.key in merged) merged[r.key] = r.value;
  return merged;
}
