import { animate, utils } from "animejs";

/** How far each card travels into the other, as a share of the centre-to-centre gap. */
const REACH = 0.22;
const MIN_TRAVEL = 40;
const MAX_TRAVEL = 110;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Axis = { key: "translateX" | "translateY"; travel: number; tilt: number };

/**
 * Cards sit side by side on desktop and stacked on mobile, so the clash has to
 * run along whichever axis actually separates them — measured, not assumed.
 */
function clashAxis(a: HTMLElement, b: HTMLElement): Axis {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  const dx = rb.left + rb.width / 2 - (ra.left + ra.width / 2);
  const dy = rb.top + rb.height / 2 - (ra.top + ra.height / 2);
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const distance = Math.abs(horizontal ? dx : dy);
  const travel = Math.max(MIN_TRAVEL, Math.min(distance * REACH, MAX_TRAVEL));
  return {
    key: horizontal ? "translateX" : "translateY",
    // A always closes towards B; the sign of the gap says which way that is.
    travel: (horizontal ? Math.sign(dx) || 1 : Math.sign(dy) || 1) * travel,
    tilt: horizontal ? 1 : 0.6,
  };
}

/** A spark at the point of contact, so each hit lands on something. */
function spark(flash: HTMLElement | null, delay: number) {
  if (!flash) return;
  animate(flash, {
    opacity: [0, 0.95],
    scale: [0.3, 1.1],
    duration: 110,
    ease: "out(2)",
    delay,
  });
  animate(flash, {
    opacity: 0,
    scale: 2.2,
    duration: 340,
    ease: "out(3)",
    delay: delay + 110,
  });
}

const WINDUP_MS = 300;
const STRIKE_MS = 260;
const RECOIL_MS = 240;
const SECOND_STRIKE_MS = 220;
const SETTLE_MS = 260;

/**
 * The two contenders pull back, lean into each other and trade a pair of hits.
 * Resolves once the cards are locked together, ready for the verdict.
 */
export async function playClash(
  a: HTMLElement,
  b: HTMLElement,
  flash: HTMLElement | null,
): Promise<void> {
  if (prefersReducedMotion()) {
    spark(flash, 0);
    await wait(240);
    return;
  }

  const axis = clashAxis(a, b);

  const lunge = (el: HTMLElement, towards: 1 | -1) => {
    const t = axis.travel * towards;
    const lean = 10 * axis.tilt * towards;
    return animate(el, {
      [axis.key]: [
        { to: -t * 0.35, duration: WINDUP_MS, ease: "out(2)" },
        { to: t, duration: STRIKE_MS, ease: "in(3)" },
        { to: t * 0.15, duration: RECOIL_MS, ease: "out(3)" },
        { to: t * 0.92, duration: SECOND_STRIKE_MS, ease: "in(3)" },
        { to: t * 0.45, duration: SETTLE_MS, ease: "out(2)" },
      ],
      rotate: [
        { to: -lean * 0.3, duration: WINDUP_MS, ease: "out(2)" },
        { to: lean, duration: STRIKE_MS, ease: "in(3)" },
        { to: lean * 0.2, duration: RECOIL_MS, ease: "out(3)" },
        { to: lean * 1.2, duration: SECOND_STRIKE_MS, ease: "in(3)" },
        { to: lean * 0.5, duration: SETTLE_MS, ease: "out(2)" },
      ],
      scale: [
        { to: 0.97, duration: WINDUP_MS, ease: "out(2)" },
        { to: 1.04, duration: STRIKE_MS, ease: "in(3)" },
        { to: 1, duration: RECOIL_MS, ease: "out(3)" },
        { to: 1.03, duration: SECOND_STRIKE_MS, ease: "in(3)" },
        { to: 1, duration: SETTLE_MS, ease: "out(2)" },
      ],
    });
  };

  spark(flash, WINDUP_MS + STRIKE_MS - 40);
  spark(flash, WINDUP_MS + STRIKE_MS + RECOIL_MS + SECOND_STRIKE_MS - 40);

  // A closes towards B, B mirrors it back.
  lunge(a, 1);
  await lunge(b, -1);
}

/** The winner swells and brightens; the loser shrinks back into the dark. */
export async function playVerdict(winner: HTMLElement, loser: HTMLElement): Promise<void> {
  winner.dataset.outcome = "win";
  loser.dataset.outcome = "lose";

  if (prefersReducedMotion()) {
    utils.set(winner, { translateX: 0, translateY: 0, rotate: 0, scale: 1 });
    utils.set(loser, { translateX: 0, translateY: 0, rotate: 0, scale: 1, opacity: 0.5 });
    return;
  }

  animate(loser, {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    scale: 0.82,
    opacity: 0.45,
    duration: 620,
    ease: "out(2)",
  });
  await animate(winner, {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    scale: 1.07,
    duration: 620,
    ease: "out(3)",
  });
}

const SWIPE_OUT_MS = 340;
const SWIPE_IN_MS = 420;

/** The settled matchup leaves to the left so the next one can arrive from the right. */
export async function swipeOut(stage: HTMLElement): Promise<void> {
  if (prefersReducedMotion()) {
    await animate(stage, { opacity: 0, duration: 140, ease: "linear" });
    return;
  }
  await animate(stage, {
    translateX: -stage.offsetWidth * 0.6 - 80,
    opacity: 0,
    duration: SWIPE_OUT_MS,
    ease: "in(2)",
  });
}

export async function swipeIn(stage: HTMLElement): Promise<void> {
  if (prefersReducedMotion()) {
    utils.set(stage, { translateX: 0 });
    await animate(stage, { opacity: [0, 1], duration: 160, ease: "linear" });
    return;
  }
  await animate(stage, {
    translateX: [stage.offsetWidth * 0.6 + 80, 0],
    opacity: [0, 1],
    duration: SWIPE_IN_MS,
    ease: "out(3)",
  });
}

/** Puts the cards back to neutral before the next matchup is dealt. */
export function resetCards(...cards: (HTMLElement | null)[]): void {
  for (const card of cards) {
    if (!card) continue;
    utils.remove(card);
    delete card.dataset.outcome;
    card.style.transform = "";
    card.style.opacity = "";
  }
}
