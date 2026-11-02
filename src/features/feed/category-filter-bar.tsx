"use client";

import { VEHICLE_CATEGORIES, VEHICLE_CATEGORY_LABELS, type VehicleCategory } from "@/lib/vehicles/category";

/** A quiet glass pill over the video; the chosen one goes solid white,
 * the way a selected filter reads in a camera app. */
function FilterChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`pressable h-8 flex-shrink-0 whitespace-nowrap rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors duration-200 disabled:opacity-60 ${
        active ? "bg-white text-black" : "bg-black/30 text-white/90 backdrop-blur-md"
      }`}
    >
      {children}
    </button>
  );
}

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
    <div className="no-scrollbar fade-edge-r flex touch-pan-x items-center gap-1.5 overflow-x-auto px-3 py-1.5">
      <FilterChip active={selected === null} disabled={disabled} onClick={() => onSelect(null)}>
        All
      </FilterChip>
      {VEHICLE_CATEGORIES.map((category) => (
        <FilterChip
          key={category}
          active={selected === category}
          disabled={disabled}
          onClick={() => onSelect(category)}
        >
          {VEHICLE_CATEGORY_LABELS[category]}
        </FilterChip>
      ))}
    </div>
  );
}
