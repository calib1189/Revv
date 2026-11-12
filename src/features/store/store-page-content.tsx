import { listStoreItemsByCategory, type StoreCategory, type StoreItem } from "@/lib/store/catalog";
import { StyledName } from "@/features/store/look-preview";
import { GemIcon, CheckIcon, WheelIcon } from "@/components/ui/icons";

/** Which of the three visual treatments a category's items use — every
 * shop's categories fall into one of these, whether it's a profile
 * name, a garage nameplate, or a crew name (same for backgrounds/
 * banners and frames), so one ItemTile handles every shop. */
export const CATEGORY_KIND: Record<StoreCategory, "text" | "background" | "ring"> = {
  name_color: "text",
  vehicle_name_color: "text",
  crew_name_color: "text",
  profile_background: "background",
  garage_backdrop: "background",
  crew_banner: "background",
  showcase_frame: "ring",
  crew_frame: "ring",
};

/** The short name each category goes by in the store's section tabs. */
export const CATEGORY_TAB_LABEL: Record<StoreCategory, string> = {
  name_color: "Name",
  vehicle_name_color: "Nameplate",
  crew_name_color: "Name",
  profile_background: "Background",
  garage_backdrop: "Backdrop",
  crew_banner: "Banner",
  showcase_frame: "Frame",
  crew_frame: "Badge",
};

const STAGE = "absolute inset-0 flex items-center justify-center bg-[#0c0c0f] bg-[radial-gradient(80%_70%_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)]";

/** The item itself, shown as itself: the name in that color, the
 * background as a panel, the frame around a showcase. Name colors sit on
 * a fixed near-black stage in both themes, since several (silver,
 * chrome, white) vanish on a light card. */
function ItemTile({ item, previewLabel }: { item: StoreItem; previewLabel: string }) {
  const kind = CATEGORY_KIND[item.category];
  if (kind === "background") {
    return <div className={`absolute inset-0 ${item.effectClassName ?? ""}`} style={{ backgroundImage: item.value }} />;
  }
  if (kind === "text") {
    return (
      <div className={`${STAGE} px-3`}>
        <StyledName item={item} className="truncate text-[1.125rem] font-bold tracking-[-0.02em]">
          {previewLabel}
        </StyledName>
      </div>
    );
  }
  return (
    <div className={STAGE}>
      <span className={`relative flex h-12 w-16 items-center justify-center rounded-[12px] bg-gradient-to-br from-neutral-600 to-neutral-900 ${item.value}`}>
        <WheelIcon className="h-5 w-5 text-white/70" />
      </span>
    </div>
  );
}

function StoreItemCard({
  item,
  previewLabel,
  owned,
  equipped,
  featured,
  onOpen,
}: {
  item: StoreItem;
  previewLabel: string;
  owned: boolean;
  equipped: boolean;
  featured: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="pressable flex min-w-0 flex-col text-left"
      aria-label={`${item.name}${featured ? ", featured this week" : ""}${owned ? (equipped ? ", equipped" : ", owned") : `, ${item.price} points`}`}
    >
      <span
        className={`relative block aspect-[3/2] w-full overflow-hidden rounded-[16px] ${
          equipped ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : "ring-1 ring-white/[0.06]"
        }`}
      >
        <ItemTile item={item} previewLabel={previewLabel} />
        {featured && (
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-md">
            Featured
          </span>
        )}
        {equipped && (
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
            <CheckIcon className="h-3 w-3" />
          </span>
        )}
      </span>
      <span className="mt-2 flex w-full items-baseline justify-between gap-2 px-0.5">
        <span className="min-w-0 truncate text-[0.875rem] font-medium">{item.name}</span>
        {owned ? (
          <span className="flex-shrink-0 text-[0.75rem] text-muted">{equipped ? "On" : "Owned"}</span>
        ) : (
          <span className="numeral flex flex-shrink-0 items-center gap-1 text-[0.8125rem] text-muted">
            <GemIcon className="h-3 w-3 text-accent" />
            {item.price.toLocaleString()}
          </span>
        )}
      </span>
    </button>
  );
}

/** One category as a calm grid, cheapest first, with this week's
 * featured piece (when it's in this category) at the front. Purely
 * presentational: balance, ownership and equipped state live in
 * StoreTabs, and tapping an item opens its try-on sheet there. */
export function StoreGrid({
  category,
  owned,
  equipped,
  previewLabel,
  featuredId,
  onOpen,
  isFounder = false,
}: {
  category: StoreCategory;
  owned: Set<string>;
  equipped: Partial<Record<StoreCategory, string | null>>;
  previewLabel: string;
  featuredId: string | null;
  onOpen: (item: StoreItem) => void;
  /** The viewer's own profiles.is_founder — the only thing that lets a
   * founderOnly item show up in this list at all. Never trust this
   * alone for the actual write, though: purchaseItemAction and every
   * equip action re-check it server-side. */
  isFounder?: boolean;
}) {
  const items = [...listStoreItemsByCategory(category, { includeFounderOnly: isFounder })].sort((a, b) => {
    if (a.id === featuredId) return -1;
    if (b.id === featuredId) return 1;
    return a.price - b.price;
  });
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
      {items.map((item) => (
        <StoreItemCard
          key={item.id}
          item={item}
          previewLabel={previewLabel}
          owned={owned.has(item.id)}
          equipped={equipped[item.category] === item.id}
          featured={item.id === featuredId}
          onOpen={() => onOpen(item)}
        />
      ))}
    </div>
  );
}
