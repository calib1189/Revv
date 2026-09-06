import {
  STORE_CATEGORY_LABELS,
  listStoreItemsByCategory,
  type StoreCategory,
  type StoreItem,
} from "@/lib/store/catalog";
import { GemIcon, CheckIcon, StarIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

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

  if (kind === "text") {
    const isGradient = item.value.includes("gradient");
    return (
      <div className="flex h-16 items-center justify-center rounded-xl bg-surface">
        <span
          className={`truncate px-2 text-lg font-bold ${isGradient ? "bg-clip-text text-transparent" : ""} ${item.effectClassName ?? ""}`}
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
        className={`h-16 rounded-xl ${item.effectClassName ?? ""}`}
        style={{ backgroundImage: item.value }}
      />
    );
  }

  return (
    <div className="flex h-16 items-center justify-center rounded-xl bg-surface">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 ${item.value}`}>
        <StarIcon className="h-5 w-5 text-accent" />
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
  return (
    <div
      className={`glass flex flex-col gap-3 rounded-2xl p-3 transition-all duration-200 ${
        equipped ? "ring-1 ring-inset ring-accent/60" : ""
      }`}
    >
      <ItemPreview item={item} previewLabel={previewLabel} />
      <div>
        <p className="truncate text-sm font-semibold">{item.name}</p>
        {!owned && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <GemIcon className="h-3.5 w-3.5 text-accent" />
            {item.price}
          </p>
        )}
      </div>

      {owned ? (
        <Button
          type="button"
          variant={equipped ? "primary" : "secondary"}
          disabled={isPending}
          onClick={onEquip}
          className="w-full justify-center py-1.5 text-xs"
        >
          {equipped ? (
            <span className="flex items-center gap-1">
              <CheckIcon className="h-3.5 w-3.5" />
              Equipped
            </span>
          ) : (
            "Equip"
          )}
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          disabled={isPending || !canAfford}
          onClick={onBuy}
          className="w-full justify-center py-1.5 text-xs"
        >
          {canAfford ? "Buy" : "Not enough"}
        </Button>
      )}
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
}) {
  return (
    <div>
      <div className="glass-raised flex items-center justify-between rounded-3xl p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 rounded-full bg-surface-raised px-4 py-2">
          <GemIcon className="h-5 w-5 text-accent" />
          <span className="text-xl font-bold tabular-nums">{balance}</span>
        </div>
      </div>

      {categories.map((category) => (
        <section key={category} className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">
            {STORE_CATEGORY_LABELS[category]}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {listStoreItemsByCategory(category).map((item) => (
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
