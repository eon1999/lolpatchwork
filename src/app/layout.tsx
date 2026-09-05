import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { getUser } from "@/lib/user";

/**
 * Riot's League face, shipped with the repo. It has no glyphs for …, — or ’, so
 * every consumer keeps a fallback stack behind it (see globals.css).
 */
const league = localFont({
  src: "../../assets/fonts/League.otf",
  variable: "--font-league",
  display: "swap",
  weight: "400",
  style: "normal",
});

export const metadata: Metadata = {
  title: { default: "LoL Patchwork", template: "%s · LoL Patchwork" },
  description:
    "Six random champions, one at a time. Stitch their model, passive and Q/W/E/R into a single monstrosity — then argue about whose is better.",
};

const LEGAL =
  "LoL Patchwork isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser().catch(() => null);
  return (
    <html lang="en" className={league.variable}>
      <body className="flex min-h-dvh flex-col antialiased">
        <PageTransition>
          <Header
            initialName={user?.displayName ?? null}
            initialUsername={user?.username ?? null}
          />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16">{children}</main>
          <footer className="border-t border-edge/60 px-4 py-6">
            <div className="mx-auto max-w-6xl space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span>LoL Patchwork</span>
                <Link className="hover:text-gold" href="/gallery">
                  Gallery
                </Link>
                <Link className="hover:text-gold" href="/battle">
                  Battle
                </Link>
                <Link className="hover:text-gold" href="/leaderboard">
                  Leaderboard
                </Link>
              </div>
              <p className="max-w-4xl text-[11px] leading-relaxed text-muted/70">{LEGAL}</p>
            </div>
          </footer>
        </PageTransition>
      </body>
    </html>
  );
}
