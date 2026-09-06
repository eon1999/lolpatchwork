"use client";

import { useCallback, useSyncExternalStore } from "react";

export type RollStyle = "reel" | "scatter" | "insta";

const STORAGE_KEY = "roll_style";
const DEFAULT: RollStyle = "reel";
const VALID: RollStyle[] = ["reel", "scatter", "insta"];

const listeners = new Set<() => void>();
let cached: RollStyle | null = null;

function read(): RollStyle {
  if (cached) return cached;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    cached = VALID.includes(stored as RollStyle) ? (stored as RollStyle) : DEFAULT;
  } catch {
    cached = DEFAULT;
  }
  return cached;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setRollStyle(style: RollStyle): void {
  cached = style;
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    /* storage unavailable */
  }
  for (const listener of listeners) listener();
}

/** The player's preferred reveal animation, persisted across sessions. */
export function useRollStyle(): [RollStyle, (style: RollStyle) => void] {
  const style = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const set = useCallback((next: RollStyle) => setRollStyle(next), []);
  return [style, set];
}
