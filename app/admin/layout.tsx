export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <nav className="flex gap-3 text-sm text-neutral-400">
        <a href="/admin">Overview</a>
        <a href="/admin/deposits">Deposits</a>
        <a href="/admin/withdrawals">Withdrawals</a>
        <a href="/admin/settings">Settings</a>
      </nav>
      {children}
    </div>
  );
}
