import Link from "next/link";

export default function Lobby() {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">six champions. one abomination.</p>
      <h1 className="mt-3 font-display text-6xl leading-none tracking-wide text-gold sm:text-7xl">
        LOL PATCHWORK
      </h1>
      <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted">
        Get six random champions and use their parts to make the perfect (or worst) champion.
      </p>
      <Link
        href="/draft"
        className="mt-9 rounded-lg border border-gold bg-gold/15 px-10 py-4 font-display text-2xl tracking-wide text-gold transition-colors hover:bg-gold hover:text-abyss"
      >
        LEZ GIT ROLLIN!!
      </Link>

      <div className="mt-14 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {[
          { n: "1", t: "DRAFT", d: "Six champions dealt one at a time. Slot machine included." },
          { n: "2", t: "PUBLISH", d: "Name your creature. Show it to everyone." },
          { n: "3", t: "BATTLE", d: "1v1 against other people's mistakes. Elo included." },
        ].map((s) => (
          <div key={s.n} className="rounded-lg border border-edge/60 bg-panel p-4 text-left">
            <div className="font-display text-3xl text-gold/70">{s.n}</div>
            <div className="mt-1 font-display text-lg tracking-wide text-gold-bright">{s.t}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex gap-4 text-sm">
        <Link href="/gallery" className="text-muted hover:text-gold">
          browse the gallery →
        </Link>
        <Link href="/battle" className="text-muted hover:text-gold">
          judge strangers →
        </Link>
      </div>
    </div>
  );
}
