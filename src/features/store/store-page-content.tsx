"use client";

import { useState, useTransition } from "react";
import {
  STORE_CATEGORY_LABELS,
  listStoreItemsByCategory,
  type StoreCategory,
  type StoreItem,
} from "@/lib/store/catalog";
import { purchaseItemAction, equipItemAction } from "@/features/store/actions";
import { GemIcon, CheckIcon, StarIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

type Equipped = Partial<Record<StoreCategory, string | null>>;

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
 * @username for profile/garage, a crew's actual name for the crew
 * shop) — the preview otherwise renders identically across shops since
 * it's driven by CATEGORY_KIND, not the category name itself. */
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

type EquipAction = (category: StoreCategory, itemId: string | null) => Promise<{ error: string | null }>;

/** The store's real state lives here (balance, ownership, equipped
 * selections) so a buy/equip click can update instantly — the server
 * action runs in the background and only the balance/ownership/equip
 * state actually needs rolling back if it fails, never a full page
 * reload just to reflect one purchase.
 *
 * Shared by all three shops (profile /store, the Garage tab, a crew's
 * Shop tab) — `categories` picks which slots this shop offers,
 * `equipAction` picks where equipping actually writes (profiles vs a
 * specific crew row; purchasing is always the same user-scoped
 * purchaseItemAction regardless of shop, since owning an item is never
 * shop-specific). */
export function StorePageContent({
  title,
  subtitle,
  categories,
  initialBalance,
  initialOwnedItemIds,
  initialEquipped,
  previewLabel,
  equipAction = equipItemAction,
}: {
  title: string;
  subtitle: string;
  categories: StoreCategory[];
  initialBalance: number;
  initialOwnedItemIds: string[];
  initialEquipped: Equipped;
  previewLabel: string;
  equipAction?: EquipAction;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [owned, setOwned] = useState(new Set(initialOwnedItemIds));
  const [equipped, setEquipped] = useState<Equipped>(initialEquipped);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function buy(item: StoreItem) {
    const previousBalance = balance;
    setError(null);
    setPendingId(item.id);
    setBalance((b) => b - item.price);
    setOwned((prev) => new Set(prev).add(item.id));
    startTransition(async () => {
      const result = await purchaseItemAction(item.id);
      if (result.error) {
        setBalance(previousBalance);
        setOwned((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        setError(result.error);
      }
      setPendingId(null);
    });
  }

  function equip(item: StoreItem) {
    const isEquipped = equipped[item.category] === item.id;
    const previous = equipped[item.category] ?? null;
    const nextId = isEquipped ? null : item.id;
    setError(null);
    setPendingId(item.id);
    setEquipped((prev) => ({ ...prev, [item.category]: nextId }));
    startTransition(async () => {
      const result = await equipAction(item.category, nextId);
      if (result.error) {
        setEquipped((prev) => ({ ...prev, [item.category]: previous }));
        setError(result.error);
      }
      setPendingId(null);
    });
  }

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

      {error && (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
      )}

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
                onBuy={() => buy(item)}
                onEquip={() => equip(item)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
