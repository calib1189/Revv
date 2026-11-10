import {
  STORE_CATEGORY_LABELS,
  listStoreItemsByCategory,
  type StoreCategory,
  type StoreItem,
} from "@/lib/store/catalog";
import { RARITY_COLOR, RARITY_LABEL, rarityFor } from "@/lib/store/rarity";
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
      <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c0f] bg-[radial-gradient(80%_70%_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)] px-3">
        <StyledName item={item} className="truncate text-[1.1875rem] font-bold tracking-[-0.02em]">
          {previewLabel}
        </StyledName>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c0f] bg-[radial-gradient(80%_70%_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)]">
      <span className={`relative flex h-14 w-[4.5rem] items-center justify-center rounded-[12px] bg-gradient-to-br from-neutral-600 to-neutral-900 ${item.value}`}>
        <WheelIcon className="h-6 w-6 text-white/70" />
      </span>
    </div>
  );
}

function StoreItemCard({
  item,
  previewLabel,
  owned,
  equipped,
  onOpen,
}: {
  item: StoreItem;
  previewLabel: string;
  owned: boolean;
  equipped: boolean;
  onOpen: () => void;
}) {
  const rarity = rarityFor(item.price, item.founderOnly);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="pressable group flex w-[42vw] max-w-[190px] flex-shrink-0 snap-start flex-col text-left sm:w-auto sm:max-w-none"
      aria-label={`${item.name}, ${RARITY_LABEL[rarity]}${owned ? (equipped ? ", equipped" : ", owned") : `, ${item.price} points`}`}
    >
      <span
        className={`relative block aspect-[5/4] w-full overflow-hidden rounded-[18px] ring-1 transition-shadow ${
          equipped ? "ring-2 ring-accent" : "ring-white/[0.06]"
        }`}
      >
        <ItemTile item={item} previewLabel={previewLabel} />
        {owned && (
          <span
            className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold backdrop-blur-md ${
              equipped ? "bg-accent text-white" : "bg-black/55 text-white"
            }`}
          >
            {equipped && <CheckIcon className="h-3 w-3" />}
            {equipped ? "Equipped" : "Owned"}
          </span>
        )}
      </span>
      <span className="mt-2 flex w-full items-start justify-between gap-2 px-0.5">
        <span className="min-w-0">
          <span className="block truncate text-[0.875rem] font-semibold">{item.name}</span>
          <span className="block text-[0.6875rem] font-bold uppercase tracking-[0.08em]" style={{ color: RARITY_COLOR[rarity] }}>
            {RARITY_LABEL[rarity]}
          </span>
        </span>
        {!owned && (
          <span className="numeral mt-0.5 flex flex-shrink-0 items-center gap-1 text-[0.8125rem] text-foreground/85">
            <GemIcon className="h-3 w-3 text-accent" />
            {item.price}
          </span>
        )}
      </span>
    </button>
  );
}

/** Purely presentational: one shelf per category. All real state
 * (balance, ownership, equipped selections) lives one level up in
 * StoreTabs, since the profile/garage/crew shops share one balance and
 * one owned-items set; tapping an item opens StoreTabs' try-on sheet. */
export function StorePageContent({
  categories,
  owned,
  equipped,
  previewLabel,
  onOpen,
  isFounder = false,
}: {
  categories: StoreCategory[];
  owned: Set<string>;
  equipped: Partial<Record<StoreCategory, string | null>>;
  previewLabel: string;
  onOpen: (item: StoreItem) => void;
  /** The viewer's own profiles.is_founder — the only thing that lets a
   * founderOnly item show up in this list at all. Never trust this
   * alone for the actual write, though: purchaseItemAction and every
   * equip action re-check it server-side. */
  isFounder?: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      {categories.map((category) => {
        const items = [...listStoreItemsByCategory(category, { includeFounderOnly: isFounder })].sort((a, b) => a.price - b.price);
        const ownedCount = items.filter((i) => owned.has(i.id)).length;
        return (
          <section key={category}>
            <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
              <h2 className="text-[1.25rem] font-bold tracking-[-0.02em]">{STORE_CATEGORY_LABELS[category]}</h2>
              <p className="numeral text-[0.75rem] text-muted">
                {ownedCount} of {items.length} owned
              </p>
            </div>
            {/* A swipeable shelf on phones, a grid once there's room for one. */}
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {items.map((item) => (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  previewLabel={previewLabel}
                  owned={owned.has(item.id)}
                  equipped={equipped[item.category] === item.id}
                  onOpen={() => onOpen(item)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
