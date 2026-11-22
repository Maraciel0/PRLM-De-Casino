import { getActiveAnnouncements } from "@/lib/announcements";

export default async function Announcements() {
  const rows = await getActiveAnnouncements();
  if (!rows.length) return null;

  return (
    <section className="space-y-2">
      {rows.map((n) => (
        <div key={n.id} className="card border-amber-900/60 bg-amber-950/20">
          <p className="text-xs text-amber-500">Notice</p>
          <p className="mt-1 text-sm">{n.body}</p>
        </div>
      ))}
    </section>
  );
}
