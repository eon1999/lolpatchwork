import { leaderboardForWeek } from "@/lib/leaderboard";
import { currentWeekKey } from "@/lib/weeks";
import { getChampion } from "@/lib/champions";
import { rateLimit } from "@/lib/ratelimit";
import { clientIpHash } from "@/lib/user";
import { ok, fail, tooMany, mapRouteError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const limited = await rateLimit("read", await clientIpHash());
    if (!limited.allowed) return tooMany(limited.retryAfterSec, "Slow down.");
    const url = new URL(req.url);
    const week = url.searchParams.get("week") ?? currentWeekKey();
    if (!/^\d{4}-W\d{2}$/.test(week)) return fail("BAD_WEEK", "Invalid week key.", 400);
    const board = await leaderboardForWeek(week);
    const withChampion = {
      ...board,
      ranked: board.ranked.map((s) => ({ ...s, modelName: getChampion(s.modelId)?.name ?? s.modelId })),
      mostBattled: board.mostBattled.map((s) => ({
        modelName: getChampion(s.modelId)?.name ?? s.modelId,
      })),
    };
    // Cookie-independent payload: safe for the Vercel edge cache to absorb floods.
    return ok(withChampion, {
      headers: { "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
