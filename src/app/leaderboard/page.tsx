import { TabsShellContent } from "@/features/shell/tabs-shell-content";
import { isVehicleCategory } from "@/lib/vehicles/category";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: rawCategory } = await searchParams;
  const category = rawCategory && isVehicleCategory(rawCategory) ? rawCategory : null;

  return <TabsShellContent initialHref="/leaderboard" leaderboardCategory={category} />;
}
