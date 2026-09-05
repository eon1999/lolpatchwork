/** Wilson score lower bound at the given z (default 95% confidence). SPEC §1.6 */
export function wilsonLowerBound(wins: number, n: number, z = 1.96): number {
  if (n <= 0) return 0;
  const p = wins / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return (centre - margin) / denominator;
}

export const LEADERBOARD_MIN_BATTLES = 8;
