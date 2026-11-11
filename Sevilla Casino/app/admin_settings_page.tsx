"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/Client";

type S = Record<string, number | boolean>;

export default function Page() {
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { api<{ settings: S }>("/api/admin/settings").then((d) => setS(d.settings)).catch(() => {}); }, []);

  const save = async () => {
    setMsg(null);
    try { await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify(s) }); setMsg("Saved."); }
    catch (e) { setMsg((e as Error).message); }
  };

  if (!s) return <p className="text-neutral-500">Operator access required.</p>;

  return (
    <div className="card space-y-3">
      <h1 className="text-lg font-semibold">House settings</h1>
      {Object.entries(s).filter(([k]) => k !== "id" && k !== "updatedAt").map(([k, v]) => (
        <label key={k} className="block text-sm">
          <span className="text-neutral-400">{k}</span>
          {typeof v === "boolean" ? (
            <input type="checkbox" className="ml-2 w-auto" checked={v} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
          ) : (
            <input value={String(v)} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} />
          )}
        </label>
      ))}
      <button onClick={save}>Save</button>
      {msg && <p className="text-sm text-amber-400">{msg}</p>}
    </div>
  );
}