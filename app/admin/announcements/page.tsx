"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/Client";

type Row = { id: string; body: string; active: boolean; createdAt: string };

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [body, setBody] = useState("");
  const load = () => api<{ rows: Row[] }>("/api/admin/announcements").then((d) => setRows(d.rows)).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Notices</h1>
      <div className="card space-y-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="New notice" />
        <button disabled={!body.trim()} onClick={async () => {
          await api("/api/admin/announcements", { method: "POST", body: JSON.stringify({ body }) });
          setBody(""); load();
        }}>Post</button>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="card flex items-start justify-between gap-3">
          <p className="text-sm">{r.body}</p>
          <div className="flex shrink-0 gap-2">
            <button className="ghost" onClick={async () => {
              await api("/api/admin/announcements", { method: "PATCH", body: JSON.stringify({ id: r.id, active: !r.active }) });
              load();
            }}>{r.active ? "Hide" : "Show"}</button>
            <button className="danger" onClick={async () => {
              await api("/api/admin/announcements", { method: "DELETE", body: JSON.stringify({ id: r.id }) });
              load();
            }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
