export const SCALE = 10_000;

export function parseAmount(v: string): number {
  const s = String(v).trim();
  if (!/^\d{1,9}(\.\d{1,4})?$/.test(s)) throw new Error("Invalid amount");
  const [w, f = ""] = s.split(".");
  return Number(w) * SCALE + Number(f.padEnd(4, "0"));
}

export function formatAmount(units: number): string {
  const w = Math.trunc(units / SCALE);
  const f = String(Math.abs(units % SCALE)).padStart(4, "0").replace(/0+$/, "");
  return `${w < 0 ? "-" : ""}${Math.abs(w)}${f ? "." + f : ""}`;
}