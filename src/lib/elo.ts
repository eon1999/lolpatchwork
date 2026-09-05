const K_FACTOR = 24;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/** Returns [newRatingA, newRatingB]. Skip votes never reach here. */
export function updateRatings(
  ratingA: number,
  ratingB: number,
  winner: "a" | "b",
): [number, number] {
  const ea = expectedScore(ratingA, ratingB);
  const sa = winner === "a" ? 1 : 0;
  const newA = ratingA + K_FACTOR * (sa - ea);
  const newB = ratingB + K_FACTOR * (1 - sa - (1 - ea));
  return [Math.round(newA), Math.round(newB)];
}
