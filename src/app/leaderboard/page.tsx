import { TabsShellContent } from "@/features/shell/tabs-shell-content";
import { isVehicleCategory } from "@/lib/vehicles/category";
import { LEADERBOARD_SCOPES, type LeaderboardScope } from "@/features/leaderboard/leaderboard-page-content";

function isLeaderboardScope(value: string): value is LeaderboardScope {
  return (LEADERBOARD_SCOPES as readonly string[]).includes(value);
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; scope?: string }>;
}) {
  const { category: rawCategory, scope: rawScope } = await searchParams;
  const category = rawCategory && isVehicleCategory(rawCategory) ? rawCategory : null;
  const scope = rawScope && isLeaderboardScope(rawScope) ? rawScope : undefined;

  return (
    <TabsShellContent
      initialHref="/leaderboard"
      leaderboardCategory={category}
      leaderboardScope={scope}
    />
  );
}
