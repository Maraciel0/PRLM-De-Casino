export const welcome = {
  eyebrow: "Parlamentum · gold only",
  title: "The House",
  intro:
    "A player-run dice hall. Deposit in-game gold, roll at published odds, withdraw whenever you like.",
  steps: [
    { title: "Link", body: "Link your Parlamentum account so the house knows where to send your gold." },
    { title: "Deposit", body: "Send gold in-game, paste the transaction ID, and it is credited once confirmed." },
    { title: "Roll", body: "Pick your odds on the dice table. Every roll is provably fair and verifiable." },
  ],
  cta: "Get started",
  ctaHref: "/link",
  fairNote:
    "Odds are fixed and published. Every roll is committed to a hashed seed before you play, and you can verify the whole history yourself.",
  footer: "In-game gold only. No real money changes hands.",
  statsLabels: {
    held: "Gold held by the house",
    edge: "House edge",
    minBet: "Minimum bet",
  },
};
