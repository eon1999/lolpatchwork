"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/components/AccountMenu";

const NAV = [
  { href: "/draft", label: "Draft" },
  { href: "/gallery", label: "Gallery" },
  { href: "/battle", label: "Battle" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export type HeaderProps = {
  initialName?: string | null;
  initialUsername?: string | null;
};

export default function Header({ initialName, initialUsername }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-edge/60 bg-abyss/85 backdrop-blur">
      {/* Three equal-weight columns keep the nav optically centered no matter how
          wide the account label gets. */}
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
        <Link
          href="/"
          className="justify-self-start font-display text-2xl leading-none tracking-wide text-gold transition-colors hover:text-gold-bright"
        >
          LOL PATCHWORK
        </Link>

        <nav className="hidden items-center gap-1 justify-self-center sm:flex">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-gold/15 text-gold-bright"
                    : "text-muted hover:bg-panel hover:text-gold"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="justify-self-end">
          <AccountMenu
            initialName={initialName ?? null}
            initialUsername={initialUsername ?? null}
          />
        </div>
      </div>

      {/* Mobile: the nav gets its own centered row instead of disappearing. */}
      <nav className="flex items-center justify-center gap-1 border-t border-edge/40 px-2 py-1.5 sm:hidden">
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                active ? "bg-gold/15 text-gold-bright" : "text-muted"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
