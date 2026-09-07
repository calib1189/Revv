"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { listStoreItemsByCategory, type StoreItem } from "@/lib/store/catalog";
import { purchaseItemAction } from "@/features/store/actions";
import { equipVehicleBackdropAction } from "@/features/garage/actions";
import { GemIcon, CheckIcon, WheelIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export interface EditorVehicle {
  id: string;
  title: string;
  heroUrl: string | null;
  equippedBackdrop: string | null;
}

const BACKDROP_ITEMS = listStoreItemsByCategory("garage_backdrop");

/** A small stand-in for the real VehicleBay — the live preview only
 * ever needs a photo and a name (no rating badge, no link), and
 * VehicleBay itself expects a full Vehicle row this page never
 * fetches. Same "car sits on the backdrop as a large framed photo,
 * bottom-center" language VehicleBay uses once a backdrop is equipped,
 * at the same proportions, so what you see here is what you'll get. */
function PreviewCard({ vehicle }: { vehicle: EditorVehicle }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15">
      {vehicle.heroUrl ? (
        <Image src={vehicle.heroUrl} alt={vehicle.title} fill sizes="(min-width: 1024px) 640px, 80vw" className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted">No photo yet</div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/0 to-transparent" />
      <p className="absolute inset-x-0 bottom-0 truncate p-3 text-lg font-semibold text-white sm:p-4">
        {vehicle.title}
      </p>
    </div>
  );
}

function VehicleSwitcher({
  vehicles,
  selectedId,
  onSelect,
}: {
  vehicles: EditorVehicle[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
      {vehicles.map((vehicle) => {
        const active = vehicle.id === selectedId;
        return (
          <button
            key={vehicle.id}
            type="button"
            onClick={() => onSelect(vehicle.id)}
            className={`flex flex-shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-medium transition-colors ${
              active ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
            }`}
          >
            <span className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised">
              {vehicle.heroUrl ? (
                <Image src={vehicle.heroUrl} alt="" fill sizes="28px" className="object-cover" />
              ) : (
                <WheelIcon className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="max-w-[9rem] truncate">{vehicle.title}</span>
          </button>
        );
      })}
    </div>
  );
}

function BackdropCard({
  item,
  owned,
  equipped,
  canAfford,
  isPending,
  onBuy,
  onEquip,
}: {
  item: StoreItem;
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
      <div
        className={`h-20 rounded-xl ${item.effectClassName ?? ""}`}
        style={{ backgroundImage: item.value }}
      />
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

/** The Garage Editor — one dedicated place to give a specific vehicle
 * its own backdrop, instead of a single account-wide setting. Buying
 * is shared across every vehicle (owning an item is an account fact,
 * same store_items_owned row every shop reads from); equipping always
 * names the currently-selected vehicle, tracked per-vehicle in
 * `equippedByVehicle` so switching cars never loses another car's
 * look. */
export function GarageEditor({
  vehicles,
  initialBalance,
  initialOwnedItemIds,
}: {
  vehicles: EditorVehicle[];
  initialBalance: number;
  initialOwnedItemIds: string[];
}) {
  const [selectedId, setSelectedId] = useState(vehicles[0].id);
  const [equippedByVehicle, setEquippedByVehicle] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(vehicles.map((v) => [v.id, v.equippedBackdrop])),
  );
  const [balance, setBalance] = useState(initialBalance);
  const [owned, setOwned] = useState(new Set(initialOwnedItemIds));
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const selected = vehicles.find((v) => v.id === selectedId) ?? vehicles[0];
  const equippedId = equippedByVehicle[selectedId] ?? null;
  const equippedItem = equippedId ? BACKDROP_ITEMS.find((i) => i.id === equippedId) : undefined;

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
    const isEquipped = equippedId === item.id;
    const nextId = isEquipped ? null : item.id;
    const previous = equippedId;
    setError(null);
    setPendingId(item.id);
    setEquippedByVehicle((prev) => ({ ...prev, [selectedId]: nextId }));
    startTransition(async () => {
      const result = await equipVehicleBackdropAction(selectedId, nextId);
      if (result.error) {
        setEquippedByVehicle((prev) => ({ ...prev, [selectedId]: previous }));
        setError(result.error);
      }
      setPendingId(null);
    });
  }

  return (
    <div>
      <div className="glass-raised flex items-center justify-between rounded-3xl p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Garage Editor</h1>
          <p className="mt-1 text-sm text-muted">
            Give each car its own backdrop, or use the same one everywhere.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 rounded-full bg-surface-raised px-4 py-2">
          <GemIcon className="h-5 w-5 text-accent" />
          <span className="text-xl font-bold tabular-nums">{balance}</span>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-8">
        {vehicles.length > 1 && (
          <VehicleSwitcher vehicles={vehicles} selectedId={selectedId} onSelect={setSelectedId} />
        )}

        {/* The whole point of this screen: see it before you buy it. Same
            16:10 stage and evenly-bordered car placement as VehicleBay
            on the real /garage page, so this preview is a true match
            for what you'll actually get, not an approximation. */}
        <div
          key={selectedId}
          className={`relative aspect-[16/10] overflow-hidden rounded-3xl transition-all duration-300 ${
            equippedItem?.effectClassName ?? "bg-surface"
          }`}
          style={equippedItem ? { backgroundImage: equippedItem.value } : undefined}
        >
          {equippedItem && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
          )}
          <div className="absolute inset-5 sm:inset-8">
            <PreviewCard vehicle={selected} />
          </div>
        </div>
        {!equippedItem && (
          <p className="mt-3 text-center text-sm text-muted">
            No backdrop equipped for {selected.title} — pick one below.
          </p>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Backdrops</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BACKDROP_ITEMS.map((item) => (
            <BackdropCard
              key={item.id}
              item={item}
              owned={owned.has(item.id)}
              equipped={equippedId === item.id}
              canAfford={balance >= item.price}
              isPending={pendingId === item.id}
              onBuy={() => buy(item)}
              onEquip={() => equip(item)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
