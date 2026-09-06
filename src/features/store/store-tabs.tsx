"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StorePageContent } from "@/features/store/store-page-content";
import { purchaseItemAction, equipItemAction } from "@/features/store/actions";
import { equipCrewItemAction } from "@/features/crews/actions";
import type { StoreCategory, StoreItem } from "@/lib/store/catalog";
import { PersonIcon, WheelIcon, FlagIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

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

function TopTabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
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
}: {
  initialBalance: number;
  initialOwnedItemIds: string[];
  profilePreviewLabel: string;
  profileEquipped: Equipped;
  garagePreviewLabel: string;
  garageEquipped: Equipped;
  crews: OwnedCrewOption[];
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
      <div className="mb-6 flex gap-2">
        <TopTabButton active={tab === "profile"} onClick={() => setTab("profile")} icon={<PersonIcon className="h-4 w-4" />}>
          Profile
        </TopTabButton>
        <TopTabButton active={tab === "garage"} onClick={() => setTab("garage")} icon={<WheelIcon className="h-4 w-4" />}>
          Garage
        </TopTabButton>
        <TopTabButton active={tab === "crew"} onClick={() => setTab("crew")} icon={<FlagIcon className="h-4 w-4" />}>
          Crew
        </TopTabButton>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
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
        />
      </div>

      <div className={tab === "garage" ? "" : "hidden"}>
        <div className="glass mb-6 flex items-center justify-between gap-3 rounded-2xl p-4">
          <div>
            <p className="text-sm font-medium">Want a backdrop for one of your cars?</p>
            <p className="text-xs text-muted">
              Backdrops are per-vehicle now — pick a car and its scene in the Garage Editor.
            </p>
          </div>
          <Link href="/garage/customize" className="flex-shrink-0">
            <Button variant="secondary" className="px-3 py-1.5 text-sm">
              Open Editor
            </Button>
          </Link>
        </div>
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
        />
      </div>

      <div className={tab === "crew" ? "" : "hidden"}>
        {crews.length === 0 ? (
          <div className="glass flex flex-col items-center justify-center gap-4 rounded-2xl py-24 text-center">
            <p className="text-lg font-medium">You don&apos;t own a crew yet</p>
            <p className="max-w-xs text-sm text-muted">
              Create a crew to customize how its page looks for everyone who visits.
            </p>
            <Link href="/crews/new">
              <Button>Create a crew</Button>
            </Link>
          </div>
        ) : (
          <>
            {crews.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {crews.map((crew) => (
                  <button
                    key={crew.id}
                    type="button"
                    onClick={() => selectCrew(crew.id)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      selectedCrewId === crew.id
                        ? "bg-accent text-accent-foreground"
                        : "glass text-muted hover:text-foreground"
                    }`}
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
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
