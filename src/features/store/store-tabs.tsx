"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StorePageContent, CATEGORY_KIND } from "@/features/store/store-page-content";
import { LookPreview, type Look, type LookScope } from "@/features/store/look-preview";
import { PointsWallet } from "@/features/store/points-packs";
import { purchaseItemAction, equipItemAction } from "@/features/store/actions";
import { equipCrewItemAction } from "@/features/crews/actions";
import { STORE_CATEGORY_LABELS, getStoreItem, type StoreCategory, type StoreItem } from "@/lib/store/catalog";
import { RARITY_COLOR, RARITY_LABEL, rarityFor } from "@/lib/store/rarity";
import { featuredItem } from "@/lib/store/featured";
import { Sheet } from "@/components/ui/sheet";
import { FlagIcon, GemIcon, ChevronRightIcon, CheckIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { DecalCard, DecalTeaser } from "@/features/decals/decal-card";
import type { DecalOffer } from "@/features/decals/decal-sheet";

type Tab = "profile" | "garage" | "crew";
type Equipped = Partial<Record<StoreCategory, string | null>>;

const PROFILE_CATEGORIES: StoreCategory[] = ["name_color", "profile_background", "showcase_frame"];
// Garage Backdrop isn't sold here — it's per-vehicle, not account-wide,
// so buying and equipping it both live in the dedicated Garage Editor
// (/garage/customize) instead. Nameplate Color stays account-wide.
const GARAGE_CATEGORIES: StoreCategory[] = ["vehicle_name_color"];
const CREW_CATEGORIES: StoreCategory[] = ["crew_name_color", "crew_banner", "crew_frame"];
const CATEGORIES: Record<Tab, StoreCategory[]> = { profile: PROFILE_CATEGORIES, garage: GARAGE_CATEGORIES, crew: CREW_CATEGORIES };

const CREW_ONLY_CATEGORIES = new Set<StoreCategory>(CREW_CATEGORIES);

/** Which equipped slot feeds each part of a tab's look preview. */
const LOOK_SLOTS: Record<Tab, { text: StoreCategory; background?: StoreCategory; ring?: StoreCategory }> = {
  profile: { text: "name_color", background: "profile_background", ring: "showcase_frame" },
  garage: { text: "vehicle_name_color" },
  crew: { text: "crew_name_color", background: "crew_banner", ring: "crew_frame" },
};

function tabOf(category: StoreCategory): Tab {
  if (CREW_ONLY_CATEGORIES.has(category)) return "crew";
  if (GARAGE_CATEGORIES.includes(category)) return "garage";
  return "profile";
}

export interface OwnedCrewOption {
  id: string;
  name: string;
  equipped: Equipped;
}

/** The single entry point for every cosmetic shop in the app — Profile,
 * Garage, and Crew all live here as tabs sharing one points balance and
 * one owned-items set (buying is never shop-specific, so three
 * independent copies of that state would drift out of sync with each
 * other the moment you switched tabs after a purchase). Equipping is
 * the only thing that differs per tab: profile/garage write to
 * profiles.equipped_* (equipItemAction), crew writes to the selected
 * crew's row instead (equipCrewItemAction) — decided per-item by
 * whether its category is crew-scoped, not by which tab is active, so
 * the same `equip` handler covers all three.
 *
 * Tapping an item opens a try-on sheet: the viewer's own look with that
 * item on, and the buy/equip action. */
export function StoreTabs({
  initialBalance,
  initialOwnedItemIds,
  profilePreviewLabel,
  profileEquipped,
  garagePreviewLabel,
  garageEquipped,
  crews,
  isFounder = false,
  userId,
  packsEnabled,
  week,
  decals = [],
  showDecals = false,
  decalPriceCents = 0,
}: {
  initialBalance: number;
  initialOwnedItemIds: string[];
  profilePreviewLabel: string;
  profileEquipped: Equipped;
  garagePreviewLabel: string;
  garageEquipped: Equipped;
  crews: OwnedCrewOption[];
  /** The viewer's own profiles.is_founder — the only thing that surfaces
   * a founderOnly item in any of these three shops at all. */
  isFounder?: boolean;
  userId: string;
  /** Whether points packs are on for this viewer (switched on, or an admin). */
  packsEnabled: boolean;
  /** Which week it is, for the featured items. */
  week: number;
  /** Rank decals the viewer's cars can order, best score first. */
  decals?: DecalOffer[];
  /** Whether decals are on for this viewer (switched on, or an admin). */
  showDecals?: boolean;
  decalPriceCents?: number;
}) {
  const [tab, setTab] = useState<Tab>("profile");
  const [balance, setBalance] = useState(initialBalance);
  const [owned, setOwned] = useState(new Set(initialOwnedItemIds));
  const [equipped, setEquipped] = useState<Equipped>({
    ...profileEquipped,
    ...garageEquipped,
    ...(crews[0]?.equipped ?? {}),
  });
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(crews[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<StoreItem | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [, startTransition] = useTransition();

  const selectedCrew = crews.find((c) => c.id === selectedCrewId) ?? null;
  const labels: Record<Tab, string> = {
    profile: profilePreviewLabel,
    garage: garagePreviewLabel,
    crew: selectedCrew?.name ?? "Your Crew",
  };

  function selectCrew(crewId: string) {
    setSelectedCrewId(crewId);
    const crew = crews.find((c) => c.id === crewId);
    if (crew) setEquipped((prev) => ({ ...prev, ...crew.equipped }));
  }

  /** A tab's look as equipped, optionally trying one item on. */
  function lookFor(scope: Tab, tryOn: StoreItem | null = null): Look {
    const slots = LOOK_SLOTS[scope];
    const pick = (category?: StoreCategory) => {
      if (!category) return null;
      if (tryOn && tryOn.category === category) return tryOn;
      const id = equipped[category];
      return id ? (getStoreItem(id) ?? null) : null;
    };
    return { text: pick(slots.text), background: pick(slots.background), ring: pick(slots.ring) };
  }

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
    const action = CREW_ONLY_CATEGORIES.has(item.category)
      ? equipCrewItemAction.bind(null, selectedCrewId!)
      : equipItemAction;

    setError(null);
    setPendingId(item.id);
    setEquipped((prev) => ({ ...prev, [item.category]: nextId }));
    startTransition(async () => {
      const result = await action(item.category, nextId);
      if (result.error) {
        setEquipped((prev) => ({ ...prev, [item.category]: previous }));
        setError(result.error);
      }
      setPendingId(null);
    });
  }

  const featured = tab === "crew" && !selectedCrew ? null : featuredItem(CATEGORIES[tab], week);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">Store</h1>
        <p className="mt-1 text-[0.9375rem] text-muted">Make your profile, cars and crew look like yours.</p>
      </header>

      <PointsWallet balance={balance} userId={userId} packsEnabled={packsEnabled} open={walletOpen} onOpenChange={setWalletOpen} />

      {showDecals && (
        <section className="flex flex-col gap-3" aria-label="Rank decals">
          {decals.length > 0 ? (
            decals.map((offer) => <DecalCard key={offer.vehicleId} offer={offer} priceCents={decalPriceCents} />)
          ) : (
            <DecalTeaser />
          )}
        </section>
      )}

      <SegmentedControl
        options={[
          { value: "profile", label: "Profile" },
          { value: "garage", label: "Garage" },
          { value: "crew", label: "Crew" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {error && <p className="rounded-[14px] bg-danger/10 px-4 py-2.5 text-[0.875rem] text-danger">{error}</p>}

      {tab === "crew" && crews.length === 0 ? (
        <EmptyState
          card
          icon={<FlagIcon />}
          title="You don't own a crew yet"
          body="Create a crew to customize how its page looks for everyone who visits."
          action={
            <Link href="/crews/new">
              <Button className="px-5">Create a crew</Button>
            </Link>
          }
        />
      ) : (
        <>
          {tab === "crew" && crews.length > 1 && (
            <div className="no-scrollbar -mx-4 -mb-2 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {crews.map((crew) => (
                <button
                  key={crew.id}
                  type="button"
                  onClick={() => selectCrew(crew.id)}
                  className={`pressable flex-shrink-0 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                    selectedCrewId === crew.id ? "bg-foreground text-background" : "text-foreground/80"
                  }`}
                  style={selectedCrewId === crew.id ? undefined : { background: "var(--segment-track)" }}
                >
                  {crew.name}
                </button>
              ))}
            </div>
          )}

          {featured && (
            <button
              type="button"
              onClick={() => setViewing(featured)}
              className="pressable group relative block w-full overflow-hidden rounded-[24px] text-left"
              aria-label={`Featured this week: ${featured.name}`}
            >
              <LookPreview scope={tab as LookScope} label={labels[tab]} look={lookFor(tab, featured)} />
              <span className="absolute left-4 top-3.5 flex flex-col items-start gap-1.5">
                <span className="rounded-full bg-black/55 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-md">
                  Featured this week
                </span>
                <span className="px-1 text-[1.0625rem] font-bold leading-tight text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">
                  {featured.name}
                  <span
                    className="ml-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em]"
                    style={{ color: RARITY_COLOR[rarityFor(featured.price, featured.founderOnly)] }}
                  >
                    {RARITY_LABEL[rarityFor(featured.price, featured.founderOnly)]}
                  </span>
                </span>
              </span>
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[0.8125rem] font-bold text-black">
                {owned.has(featured.id) ? (
                  "Owned"
                ) : (
                  <>
                    <GemIcon className="h-3.5 w-3.5 text-accent" />
                    <span className="numeral">{featured.price}</span>
                  </>
                )}
              </span>
            </button>
          )}

          {tab === "garage" && (
            <Link href="/garage/customize" className="pressable glass-raised elev-1 flex items-center gap-3.5 rounded-[20px] p-3.5">
              <span
                className="bg-ruby-anim h-11 w-11 flex-shrink-0 rounded-[12px]"
                style={{ backgroundImage: "linear-gradient(150deg, #1a0004, #5c0014, #ff0a2e, #ff4d6d, #ff0a2e, #5c0014, #1a0004)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-semibold">Garage backdrops</p>
                <p className="text-[0.8125rem] leading-snug text-muted">Pick a scene for each car in the Garage Editor.</p>
              </div>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
            </Link>
          )}

          <StorePageContent
            key={tab === "crew" ? selectedCrew?.id : tab}
            categories={CATEGORIES[tab]}
            owned={owned}
            equipped={equipped}
            previewLabel={labels[tab]}
            onOpen={setViewing}
            isFounder={isFounder}
          />
        </>
      )}

      <Sheet open={viewing !== null} onClose={() => setViewing(null)} title={viewing ? STORE_CATEGORY_LABELS[viewing.category] : ""}>
        {viewing && (
          <ItemDetail
            item={viewing}
            scope={tabOf(viewing.category)}
            label={labels[tabOf(viewing.category)]}
            look={lookFor(tabOf(viewing.category), viewing)}
            owned={owned.has(viewing.id)}
            equipped={equipped[viewing.category] === viewing.id}
            balance={balance}
            pending={pendingId === viewing.id}
            packsEnabled={packsEnabled}
            onBuy={() => buy(viewing)}
            onEquip={() => equip(viewing)}
            onGetPoints={() => {
              setViewing(null);
              setWalletOpen(true);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

/** The try-on sheet: the item on the viewer's own look, then the one
 * thing to do with it (buy, equip, or take off). */
function ItemDetail({
  item,
  scope,
  label,
  look,
  owned,
  equipped,
  balance,
  pending,
  packsEnabled,
  onBuy,
  onEquip,
  onGetPoints,
}: {
  item: StoreItem;
  scope: Tab;
  label: string;
  look: Look;
  owned: boolean;
  equipped: boolean;
  balance: number;
  pending: boolean;
  packsEnabled: boolean;
  onBuy: () => void;
  onEquip: () => void;
  onGetPoints: () => void;
}) {
  const rarity = rarityFor(item.price, item.founderOnly);
  const short = item.price - balance;
  return (
    <div className="flex flex-col gap-4 pb-1">
      <LookPreview scope={scope} label={label} look={look} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[1.375rem] font-bold leading-tight tracking-[-0.02em]">{item.name}</p>
          <p className="mt-1 text-[0.75rem] font-bold uppercase tracking-[0.1em]" style={{ color: RARITY_COLOR[rarity] }}>
            {RARITY_LABEL[rarity]} · {CATEGORY_KIND[item.category] === "text" ? "Color" : CATEGORY_KIND[item.category] === "background" ? "Background" : "Frame"}
          </p>
        </div>
        {!owned && (
          <p className="numeral flex flex-shrink-0 items-center gap-1.5 text-[1.375rem] font-bold">
            <GemIcon className="h-4 w-4 text-accent" />
            {item.price}
          </p>
        )}
      </div>
      <p className="text-[0.8125rem] text-muted">
        {owned ? "You own this. Equip it to show it off, or take it off anytime." : "Previewed on you above. Once it's yours, it's yours for good."}
      </p>

      {owned ? (
        <button
          type="button"
          disabled={pending}
          onClick={onEquip}
          className={`pressable flex h-12 w-full items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold disabled:opacity-60 ${
            equipped ? "bg-foreground/[0.08] text-foreground" : "bg-accent text-accent-foreground"
          }`}
        >
          {equipped && <CheckIcon className="h-4 w-4 text-accent" />}
          {equipped ? "Equipped. Tap to take off" : "Equip"}
        </button>
      ) : short <= 0 ? (
        <button
          type="button"
          disabled={pending}
          onClick={onBuy}
          className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-semibold text-accent-foreground disabled:opacity-60"
        >
          Buy for <GemIcon className="h-4 w-4" /> <span className="numeral">{item.price}</span>
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="numeral text-center text-[0.875rem] font-semibold">You need {short.toLocaleString()} more points</p>
          {packsEnabled ? (
            <button
              type="button"
              onClick={onGetPoints}
              className="pressable flex h-12 w-full items-center justify-center rounded-full bg-accent text-[0.9375rem] font-semibold text-accent-foreground"
            >
              Get points
            </button>
          ) : (
            <Link
              href="/daily"
              className="pressable flex h-12 w-full items-center justify-center rounded-full bg-foreground/[0.08] text-[0.9375rem] font-semibold"
            >
              Earn points in Sorza Daily
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
