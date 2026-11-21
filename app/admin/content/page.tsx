"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/Client";

export default function Page() {
  const [text, setText] = useState<Record<string, string> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ text: Record<string, string> }>("/api/admin/content")
      .then((d) => setText(d.text))
      .catch((e) => setMsg((e as Error).message));
  }, []);

  if (!text) return <p className="text-neutral-500">{msg ?? "Loading…"}</p>;

  return (
    <div className="card space-y-3">
      <h1 className="text-lg font-semibold">Landing page text</h1>
      <p className="text-sm text-neutral-500">
        The key on the left is where the text appears. Edit the box, then Save all.
      </p>

      {Object.entries(text).map(([k, v]) => (
        <label key={k} className="block text-sm">
          <span className="text-neutral-500">{k}</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            rows={v.length > 80 ? 3 : 1}
            value={v}
            onChange={(e) => setText({ ...text, [k]: e.target.value })}
          />
        </label>
      ))}

      <button onClick={async () => {
        setMsg(null);
        try {
          await api("/api/admin/content", { method: "PATCH", body: JSON.stringify(text) });
          setMsg("Saved.");
        } catch (e) {
          setMsg((e as Error).message);
        }
      }}>Save all</button>
      {msg && <p className="text-sm text-amber-400">{msg}</p>}
    </div>
  );
}
