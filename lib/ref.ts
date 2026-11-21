const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function refCode(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const body = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
}
