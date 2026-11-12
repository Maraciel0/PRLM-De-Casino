const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function refCode(prefix: "DEP" | "WDR"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const body = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${prefix}-${body}`;
}