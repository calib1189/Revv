"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StorePageContent } from "@/features/store/store-page-content";
import { purchaseItemAction, equipItemAction } from "@/features/store/actions";
import { equipCrewItemAction } from "@/features/crews/actions";
import type { StoreCategory, StoreItem } from "@/lib/store/catalog";
import { FlagIcon, GemIcon, ChevronRightIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";

type Tab = "profile" | "garage" | "crew";
type Equipped = Partial<Record<StoreCategory, string | null>>;

const PROFILE_CATEGORIES: StoreCategory[] = ["name_color", "profile_background", "showcase_frame"];
// Garage Backdrop isn't sold here — it's per-vehicle, not account-wide,
// so buying and equipping it both live in the dedicated Garage Editor
// (/garage/customize) instead. Nameplate Color stays account-wide.
const GARAGE_CATEGORIES: StoreCategory[] = ["vehicle_name_color"];
const CREW_CATEGORIES: StoreCategory[] = ["crew_name_color", "crew_banner", "crew_frame"];

const CREW_ONLY_CATEGORIES = new Set<StoreCategory>(CREW_CATEGORIES);

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
 * the same `equip` handler covers all three. */
export function StoreTabs({
  initialBalance,
  initialOwnedItemIds,
  profilePreviewLabel,
  profileEquipped,
  garagePreviewLabel,
  garageEquipped,
  crews,
  isFounder = false,
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
  const [, startTransition] = useTransition();

  const selectedCrew = crews.find((c) => c.id === selectedCrewId) ?? null;

  function selectCrew(crewId: string) {
    setSelectedCrewId(crewId);
    const crew = crews.find((c) => c.id === crewId);
    if (crew) setEquipped((prev) => ({ ...prev, ...crew.equipped }));
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

  return (
    <div>
      <header className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">Store</h1>
        </div>
        <div
          className="mb-1 flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5"
          style={{ background: "var(--segment-track)" }}
          aria-label={`${balance} points`}
        >
          <GemIcon className="h-4 w-4 text-accent" />
          <span className="numeral text-[1.0625rem] leading-none">{balance}</span>
        </div>
      </header>

      <SegmentedControl
        className="mb-6"
        options={[
          { value: "profile", label: "Profile" },
          { value: "garage", label: "Garage" },
          { value: "crew", label: "Crew" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {error && (
        <p className="mb-4 rounded-[14px] bg-danger/10 px-4 py-2.5 text-[0.875rem] text-danger">{error}</p>
      )}

      <div className={tab === "profile" ? "" : "hidden"}>
        <StorePageContent
          title="Store"
          subtitle="Earned from achievements and weekly challenges — spend it on how your profile looks."
          categories={PROFILE_CATEGORIES}
          balance={balance}
          owned={owned}
          equipped={equipped}
          pendingId={pendingId}
          previewLabel={profilePreviewLabel}
          onBuy={buy}
          onEquip={equip}
          isFounder={isFounder}
        />
      </div>

      <div className={tab === "garage" ? "" : "hidden"}>
        <Link
          href="/garage/customize"
          className="pressable glass-raised elev-1 mb-6 flex items-center gap-3.5 rounded-[22px] p-4"
        >
          <span className="bg-ruby-anim h-12 w-12 flex-shrink-0 rounded-[12px]" style={{ backgroundImage: "linear-gradient(150deg, #1a0004, #5c0014, #ff0a2e, #ff4d6d, #ff0a2e, #5c0014, #1a0004)" }} />
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-semibold">Garage backdrops</p>
            <p className="text-[0.8125rem] leading-snug text-muted">
              Pick a scene for each car in the Garage Editor.
            </p>
          </div>
          <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
        </Link>
        <StorePageContent
          title="Garage Shop"
          subtitle="Spend your points on how your cars look."
          categories={GARAGE_CATEGORIES}
          balance={balance}
          owned={owned}
          equipped={equipped}
          pendingId={pendingId}
          previewLabel={garagePreviewLabel}
          onBuy={buy}
          onEquip={equip}
          isFounder={isFounder}
        />
      </div>

      <div className={tab === "crew" ? "" : "hidden"}>
        {crews.length === 0 ? (
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
            {crews.length > 1 && (
              <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
            {selectedCrew && (
              <StorePageContent
                key={selectedCrew.id}
                title="Crew Shop"
                subtitle="Spend your points on how this crew's page looks — everyone who visits sees it."
                categories={CREW_CATEGORIES}
                balance={balance}
                owned={owned}
                equipped={equipped}
                pendingId={pendingId}
                previewLabel={selectedCrew.name}
                onBuy={buy}
                onEquip={equip}
                isFounder={isFounder}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
