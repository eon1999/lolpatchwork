"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/components/AccountMenu";

const NAV = [
  { href: "/draft", label: "Draft" },
  { href: "/gallery", label: "Gallery" },
  { href: "/battle", label: "Battle" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/mine", label: "Mine" },
];

export type HeaderProps = {
  initialName?: string | null;
  initialUsername?: string | null;
};

const KOFI_URL = "https://ko-fi.com/vietdang";

function SupportButton() {
  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Support the project on Ko-fi"
      className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-sm text-muted transition-colors hover:border-gold/60 hover:text-gold"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden className="text-blood">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span className="hidden md:inline">Support</span>
    </a>
  );
}

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

        <div className="flex items-center justify-end gap-2">
          <SupportButton />
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
