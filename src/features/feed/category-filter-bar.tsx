"use client";

import { FilterIcon } from "@/components/ui/icons";
import { VEHICLE_CATEGORIES, VEHICLE_CATEGORY_LABELS, type VehicleCategory } from "@/lib/vehicles/category";

/** Floats over the top of the FYP video (a sibling of the scroll
 * container in swipe-feed.tsx, not inside it) so it stays in place while
 * swiping between videos instead of scrolling away with the current one.
 * Filters which vehicle category's posts show — a real query against
 * vehicles.category (loadFeedByCategoryAction/loadMoreFeedPostsAction),
 * not a decorative row; there's no "Following" or "Builds" chip here
 * because neither is a real, queryable thing this app tracks. */
export function CategoryFilterBar({
  selected,
  onSelect,
  disabled,
}: {
  selected: VehicleCategory | null;
  onSelect: (category: VehicleCategory | null) => void;
  disabled?: boolean;
}) {
  return (
    // This overlay floats as a sibling of the vertically-scrolling video
    // (see swipe-feed.tsx), not a descendant of it — a vertical drag
    // starting here has no scrollable ancestor to fall back to, so
    // without an explicit touch-action the browser was letting it
    // drag/pan this row itself instead of the video underneath.
    // touch-pan-x tells it this element only ever handles horizontal
    // gestures; vertical ones are left for whatever's actually meant to
    // handle them.
    <div className="no-scrollbar flex touch-pan-x items-center gap-2 overflow-x-auto px-3 py-2">
      <button
        type="button"
        aria-label="Reset filter"
        disabled={disabled}
        onClick={() => onSelect(null)}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-60"
      >
        <FilterIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
          selected === null ? "bg-accent text-accent-foreground" : "bg-black/50 text-white/90"
        }`}
      >
        All
      </button>
      {VEHICLE_CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(category)}
          className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            selected === category ? "bg-accent text-accent-foreground" : "bg-black/50 text-white/90"
          }`}
        >
          {VEHICLE_CATEGORY_LABELS[category]}
        </button>
      ))}
    </div>
  );
}
