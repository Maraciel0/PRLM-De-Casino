export default function Footer() {
  return (
    <footer className="mt-12 border-t border-neutral-800 px-6 py-6">
      <div className="mx-auto flex max-w-3xl flex-wrap gap-5 text-xs text-neutral-600">
        <a href="/odds" className="hover:text-neutral-300">Odds &amp; rules</a>
        <a href="/games" className="hover:text-neutral-300">Games</a>
      </div>
    </footer>
  );
}
