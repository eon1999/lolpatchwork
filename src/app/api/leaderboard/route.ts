import { leaderboardForWeek } from "@/lib/leaderboard";
import { currentWeekKey } from "@/lib/weeks";
import { getChampion } from "@/lib/champions";
import { ok, fail } from "@/lib/api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const week = url.searchParams.get("week") ?? currentWeekKey();
  if (!/^\d{4}-W\d{2}$/.test(week)) return fail("BAD_WEEK", "Invalid week key.", 400);
  const board = await leaderboardForWeek(week);
  const withChampion = {
    ...board,
    ranked: board.ranked.map((s) => ({ ...s, modelName: getChampion(s.modelId)?.name ?? s.modelId })),
    mostBattled: board.mostBattled.map((s) => ({
      ...s,
      modelName: getChampion(s.modelId)?.name ?? s.modelId,
    })),
  };
  return ok(withChampion);
}
