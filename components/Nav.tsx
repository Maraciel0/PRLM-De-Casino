"use client";
import { useSession } from "./Client";

export default function Nav() {
  const { user, loading, text } = useSession();
  const brand = text.brand ?? "The House";

  if (loading) return <a href="/" className="font-semibold">{brand}</a>;

  return (
    <>
      <a href="/" className="font-semibold">{brand}</a>
      <nav>
        <a href="/games">{text.navGames ?? "Games"}</a>
        <a href="/wallet">{text.navWallet ?? "Wallet"}</a>
        {user && <a href="/profile">{text.navProfile ?? "Profile"}</a>}
        {user?.role === "operator" && <a href="/admin">{text.navAdmin ?? "Admin"}</a>}
        {!user && <a href="/login">{text.navSignIn ?? "Sign in"}</a>}
      </nav>
    </>
  );
}
