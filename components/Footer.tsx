export default function Footer() {
  return (
    <footer className="mt-12 border-t border-line px-6 py-6">
      <div className="mx-auto flex max-w-[52rem] flex-wrap gap-5 text-xs text-neutral-500">
        <a href="/odds" className="hover:text-gold-bright">Odds &amp; rules</a>
        <a href="/games" className="hover:text-gold-bright">Games</a>
      </div>
    </footer>
  );
}
