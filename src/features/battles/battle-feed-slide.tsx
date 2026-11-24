import { HEADER_HEIGHT } from "@/components/shell/tab-pager-shell";
import { BattleCard } from "@/features/battles/battle-card";
import type { BattleView } from "@/lib/battles/load";

/** Today's Build Battle as a feed slide, clear of the floating header
 * and category bar up top and the tab bar below. */
export function BattleFeedSlide({
  view,
  isAuthenticated,
  viewerUsername,
  slideHeight,
}: {
  view: BattleView;
  isAuthenticated: boolean;
  viewerUsername: string | null;
  slideHeight: string;
}) {
  return (
    <div
      className={`relative ${slideHeight} w-full flex-shrink-0 snap-start overflow-hidden bg-black px-3`}
      style={{
        paddingTop: `calc(${HEADER_HEIGHT} + 3.5rem)`,
        paddingBottom: "calc(var(--bottom-nav-h) + 0.75rem)",
      }}
    >
      <BattleCard view={view} isAuthenticated={isAuthenticated} viewerUsername={viewerUsername} className="h-full" tone="media" />
    </div>
  );
}
