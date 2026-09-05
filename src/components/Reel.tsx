"use client";

import Image from "next/image";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { animate, createTimeline, cubicBezier } from "animejs";

const ITEMS = 44;
const FINAL_INDEX = ITEMS - 1;
const DEFAULT_SIZE = 96;

export type ReelItem = { src: string; alt: string };
export type ReelHandle = { spin: (final: ReelItem) => Promise<void> };

/**
 * The slot reel (SPEC §2.8). Vertical champion-icon strip by default,
 * horizontal ability-icon strip with axis="x".
 * The drawn champion is only ever populated from the caller's data —
 * the spin does not start until /reveal has landed.
 */
const Reel = forwardRef<
  ReelHandle,
  { axis?: "x" | "y"; decor: () => ReelItem; className?: string; size?: number }
>(function Reel({ axis = "y", decor, className, size = DEFAULT_SIZE }, ref) {
  const [items, setItems] = useState<ReelItem[]>(() =>
    Array.from({ length: ITEMS }, decor),
  );
  const stripRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const pending = useRef<ReelItem | null>(null);
  const resolver = useRef<((v: void) => void) | null>(null);
  const [armed, setArmed] = useState(0);

  useImperativeHandle(ref, () => ({
    spin(final: ReelItem) {
      const filler: ReelItem[] = [];
      for (let i = 0; i < FINAL_INDEX; i++) filler.push(decor());
      pending.current = final;
      setItems([...filler, final]);
      setArmed((n) => n + 1);
      return new Promise<void>((resolve) => {
        resolver.current = resolve;
      });
    },
  }));

  useEffect(() => {
    if (!armed || !pending.current) return;
    const final = pending.current;
    pending.current = null;
    const strip = stripRef.current!;
    const flash = flashRef.current!;
    const frame = frameRef.current!;
    const finalEl = finalRef.current;
    const prop = axis === "y" ? "translateY" : "translateX";
    const finalPos = -(FINAL_INDEX * size);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void final;

    const done = () => resolver.current?.();

    if (reduced) {
      // Reduced motion: cross-fade straight to the reveal, <400ms total (AC §2.8).
      strip.style.transform = `${prop}(${finalPos}px)`;
      if (finalEl) animate(finalEl, { opacity: [0, 1], duration: 200, ease: "out(2)" });
      animate(flash, { opacity: [0.1, 0], duration: 150, ease: "linear" });
      setTimeout(done, 210);
      return;
    }

    strip.style.transform = `${prop}(0px)`;
    if (finalEl) finalEl.style.opacity = "1";

    const t = (value: number) => ({ [prop]: value }) as Record<string, number>;

    const tl = createTimeline({ defaults: { ease: "linear" } });
    tl.add(strip, { ...t(-24), duration: 220, ease: "out(3)" }, 0);
    tl.add(strip, { ...t(24), duration: 80, ease: "in(2)" }, 220);
    tl.add(
      strip,
      { ...t(finalPos), duration: 1900, ease: cubicBezier(0.16, 0.9, 0.28, 1) },
      300,
    );
    tl.add(strip, { ...t(finalPos - 8), duration: 70, ease: "out(2)" }, 2200);
    tl.add(strip, { ...t(finalPos), duration: 70, ease: "out(3)" }, 2270);
    tl.add(
      strip,
      { filter: ["blur(0px)", "blur(6px)", "blur(0px)"], duration: 1900 },
      300,
    );
    tl.add(flash, { opacity: [0.35, 0], duration: 180, ease: "out(2)" }, 2340);
    tl.add(frame, { translateX: [0, -4, 4, -2, 2, 0], duration: 180 }, 2340);
    if (finalEl) {
      tl.add(finalEl, { scale: [1, 1.08, 1], duration: 180, ease: "out(2)" }, 2340);
    }
    void tl.then(done);
  }, [armed, axis, size]);

  return (
    <div
      ref={frameRef}
      style={axis === "y" ? { width: size, height: size } : { height: size }}
      className={`relative overflow-hidden rounded-lg border border-edge/70 bg-deep ${
        className ?? ""
      }`}
    >
      <div
        ref={stripRef}
        className={`flex will-change-transform ${axis === "y" ? "flex-col" : "flex-row"}`}
        style={{ transform: axis === "y" ? "translateY(0px)" : "translateX(0px)" }}
      >
        {items.map((item, i) => (
          <div
            key={`${armed}-${i}`}
            ref={i === FINAL_INDEX ? finalRef : undefined}
            className="flex shrink-0 items-center justify-center"
            style={{ width: size, height: size }}
          >
            <Image
              src={item.src}
              alt={item.alt}
              width={size}
              height={size}
              loading="eager"
              unoptimized
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      <div
        ref={flashRef}
        className="pointer-events-none absolute inset-0 bg-white opacity-0"
      />
      <div
        className={`pointer-events-none absolute inset-0 ${
          axis === "y" ? "reel-mask" : "reel-mask-x"
        }`}
      />
    </div>
  );
});

export default Reel;
