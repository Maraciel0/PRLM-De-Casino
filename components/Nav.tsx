"use client";
import { useSession } from "./Client";

export default function Nav() {
  const { user, loading } = useSession();
  if (loading) return <nav />;

  return (
    <nav>
      <a href="/games">Games</a>
      <a href="/wallet">Wallet</a>
      {user && <a href="/profile">Profile</a>}
      {user?.role === "operator" && <a href="/admin">Admin</a>}
      {!user && <a href="/login">Sign in</a>}
    </nav>
  );
}
