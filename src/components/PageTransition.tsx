"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ClampTransition from "@/components/ClampTransition";

/** If a route stalls, open anyway rather than leaving the screen sealed shut. */
const MAX_HOLD_MS = 2500;

function isPlainLeftClick(event: MouseEvent): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * Plays the clamp between pages. Rather than swapping every <Link> for a custom
 * one, this intercepts plain left-clicks on internal anchors at the document
 * level, so navigation looks the same everywhere — including links added later.
 * Opt out of a single link with `data-no-transition`.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [target, setTarget] = useState<{ href: string; path: string } | null>(null);

  const arrived = useRef(false);
  const resolveArrival = useRef<(() => void) | null>(null);

  // The route we asked for has mounted — let the walls open.
  useEffect(() => {
    if (target && pathname === target.path) {
      arrived.current = true;
      resolveArrival.current?.();
    }
  }, [pathname, target]);

  const holdUntil = useCallback(() => {
    if (arrived.current) return Promise.resolve();
    return Promise.race([
      new Promise<void>((resolve) => {
        resolveArrival.current = resolve;
      }),
      new Promise<void>((resolve) => setTimeout(resolve, MAX_HOLD_MS)),
    ]);
  }, []);

  const start = useCallback((href: string, path: string) => {
    arrived.current = false;
    resolveArrival.current = null;
    setTarget({ href, path });
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!isPlainLeftClick(event)) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download") || anchor.dataset.noTransition !== undefined) return;

      const url = new URL(href, window.location.origin);
      // Same-page anchors and re-clicks of the current route stay instant.
      if (url.pathname === window.location.pathname) return;

      // next/link handles clicks on React's root listener and preventDefaults
      // there, so this has to run in the capture phase and stop the event before
      // Link ever sees it — otherwise the route changes with no transition.
      event.preventDefault();
      event.stopPropagation();
      start(url.pathname + url.search, url.pathname);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  // Warm the route while the pointer is on its way to the click.
  useEffect(() => {
    function onOver(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (href && href.startsWith("/") && !href.startsWith("//")) router.prefetch(href);
    }
    document.addEventListener("mouseover", onOver);
    return () => document.removeEventListener("mouseover", onOver);
  }, [router]);

  return (
    <>
      {children}
      {target && (
        <ClampTransition
          onCovered={() => router.push(target.href)}
          holdUntil={holdUntil}
          onDone={() => setTarget(null)}
        />
      )}
    </>
  );
}
