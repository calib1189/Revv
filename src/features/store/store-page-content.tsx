import {
  STORE_CATEGORY_LABELS,
  listStoreItemsByCategory,
  type StoreCategory,
  type StoreItem,
} from "@/lib/store/catalog";
import { GemIcon, CheckIcon, StarIcon } from "@/components/ui/icons";

/** Which of the three visual treatments a category's items use — every
 * shop's categories fall into one of these, whether it's a profile
 * name, a garage nameplate, or a crew name (same for backgrounds/
 * banners and frames), so this table lets one ItemPreview handle every
 * shop without a per-shop copy of the same three branches. */
const CATEGORY_KIND: Record<StoreCategory, "text" | "background" | "ring"> = {
  name_color: "text",
  vehicle_name_color: "text",
  crew_name_color: "text",
  profile_background: "background",
  garage_backdrop: "background",
  crew_banner: "background",
  showcase_frame: "ring",
  crew_frame: "ring",
};

/** The live preview inside each item card — what you're actually
 * buying, shown as itself rather than described in text. `previewLabel`
 * is whatever text this shop should preview the color on (an
 * @username for the profile shop, a sample car name for garage, a
 * crew's actual name for crew) — the preview otherwise renders
 * identically across shops since it's driven by CATEGORY_KIND, not the
 * category name itself. */
function ItemPreview({ item, previewLabel }: { item: StoreItem; previewLabel: string }) {
  const kind = CATEGORY_KIND[item.category];

  // Text previews sit on a fixed near-black stage in both themes — name
  // colours are designed to be seen on the dark app surfaces, and
  // several (silver, chrome, white) vanish on a light card.
  if (kind === "text") {
    const isGradient = item.value.includes("gradient");
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-[16px] bg-neutral-900">
        <span
          className={`truncate px-3 text-[1.25rem] font-bold tracking-[-0.01em] ${isGradient ? "bg-clip-text text-transparent" : ""} ${item.effectClassName ?? ""}`}
          style={isGradient ? { backgroundImage: item.value } : { color: item.value }}
        >
          {previewLabel}
        </span>
      </div>
    );
  }

  if (kind === "background") {
    return (
      <div
        className={`aspect-[4/3] rounded-[16px] ${item.effectClassName ?? ""}`}
        style={{ backgroundImage: item.value }}
      />
    );
  }

  return (
    <div className="flex aspect-[4/3] items-center justify-center rounded-[16px] bg-neutral-900">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ${item.value}`}>
        <StarIcon className="h-6 w-6 text-[#f0cd6e]" />
      </span>
    </div>
  );
}

function StoreItemCard({
  item,
  previewLabel,
  owned,
  equipped,
  canAfford,
  isPending,
  onBuy,
  onEquip,
}: {
  item: StoreItem;
  previewLabel: string;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  isPending: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  // App Store "Get" capsule: grey pill, accent label. Equipped flips to
  // a solid accent pill with a check.
  const capsule =
    "pressable flex h-[30px] min-w-[76px] items-center justify-center gap-1 rounded-full px-3.5 text-[0.8125rem] font-bold disabled:opacity-50";

  return (
    <div className="flex w-[44vw] max-w-[200px] flex-shrink-0 snap-start flex-col sm:w-auto sm:max-w-none">
      <div className={`rounded-[18px] transition-shadow ${equipped ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`}>
        <ItemPreview item={item} previewLabel={previewLabel} />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[0.875rem] font-semibold">{item.name}</p>
      </div>
      <div className="mt-2">
        {owned ? (
          <button
            type="button"
            disabled={isPending}
            onClick={onEquip}
            className={`${capsule} ${equipped ? "bg-accent text-accent-foreground" : "text-accent"}`}
            style={equipped ? undefined : { background: "var(--segment-track)" }}
          >
            {equipped ? (
              <>
                <CheckIcon className="h-3.5 w-3.5" />
                On
              </>
            ) : (
              "Equip"
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending || !canAfford}
            onClick={onBuy}
            aria-label={`Buy ${item.name} for ${item.price} points`}
            className={`${capsule} text-accent`}
            style={{ background: "var(--segment-track)" }}
          >
            <GemIcon className="h-3.5 w-3.5" />
            <span className="numeral">{item.price}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Purely presentational — one category grid of item cards. All real
 * state (balance, ownership, equipped selections, in-flight actions)
 * lives one level up in StoreTabs, since the profile/garage/crew shops
 * share a single balance and owned-items set (buying is never
 * shop-specific) and need to stay in sync with each other as the
 * viewer switches tabs, which a self-contained per-shop component
 * couldn't do. */
export function StorePageContent({
  title,
  subtitle,
  categories,
  balance,
  owned,
  equipped,
  pendingId,
  previewLabel,
  onBuy,
  onEquip,
  isFounder = false,
}: {
  title: string;
  subtitle: string;
  categories: StoreCategory[];
  balance: number;
  owned: Set<string>;
  equipped: Partial<Record<StoreCategory, string | null>>;
  pendingId: string | null;
  previewLabel: string;
  onBuy: (item: StoreItem) => void;
  onEquip: (item: StoreItem) => void;
  /** The viewer's own profiles.is_founder — the only thing that lets a
   * founderOnly item show up in this list at all. Never trust this
   * alone for the actual write, though: purchaseItemAction and every
   * equip action re-check it server-side. */
  isFounder?: boolean;
}) {
  return (
    <div>
      <p className="px-1 text-[0.9375rem] leading-relaxed text-muted" aria-label={title}>
        {subtitle}
      </p>

      {categories.map((category) => (
        <section key={category} className="mt-8">
          <h2 className="mb-3 px-1 text-[1.375rem] font-bold tracking-[-0.02em]">
            {STORE_CATEGORY_LABELS[category]}
          </h2>
          {/* A swipeable shelf on phones (App Store style), a grid once
              there's room for one. */}
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {listStoreItemsByCategory(category, { includeFounderOnly: isFounder }).map((item) => (
              <StoreItemCard
                key={item.id}
                item={item}
                previewLabel={previewLabel}
                owned={owned.has(item.id)}
                equipped={equipped[item.category] === item.id}
                canAfford={balance >= item.price}
                isPending={pendingId === item.id}
                onBuy={() => onBuy(item)}
                onEquip={() => onEquip(item)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
