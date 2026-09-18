"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { listStoreItemsByCategory, type StoreItem } from "@/lib/store/catalog";
import { purchaseItemAction } from "@/features/store/actions";
import { equipVehicleBackdropAction } from "@/features/garage/actions";
import { GemIcon, CheckIcon, WheelIcon } from "@/components/ui/icons";

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
function PreviewCard({ vehicle, backdrop }: { vehicle: EditorVehicle; backdrop: StoreItem | undefined }) {
  const photo = vehicle.heroUrl ? (
    <Image src={vehicle.heroUrl} alt={vehicle.title} fill sizes="(min-width: 1024px) 640px, 90vw" className="object-cover" />
  ) : (
    <div className="flex h-full items-center justify-center bg-neutral-900 text-sm text-white/50">No photo yet</div>
  );
  const title = (
    <p className="line-clamp-2 text-[1.75rem] font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-[2.5rem]">
      {vehicle.title}
    </p>
  );
  const bar = (
    <div
      className="flex items-center gap-3 border-t border-white/10 bg-black/35 px-4 py-3 sm:px-6 sm:py-4"
      style={{ WebkitBackdropFilter: "blur(40px) saturate(180%)", backdropFilter: "blur(40px) saturate(180%)" }}
    >
      <span className="h-9 w-9 flex-shrink-0 rounded-full bg-white/15" />
      <div className="min-w-0 flex-1">
        <span className="block h-2 w-14 rounded-full bg-white/30" />
        <span className="mt-1.5 block h-2 w-20 rounded-full bg-white/15" />
      </div>
      <span className="numeral text-[1.625rem] leading-none text-white/40">--.--</span>
    </div>
  );

  return (
    <div className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-[28px] bg-neutral-950 elev-3 sm:aspect-[16/10]">
      {backdrop ? (
        <>
          <div
            className={`absolute inset-0 ${backdrop.effectClassName ?? ""}`}
            style={{ backgroundImage: backdrop.value }}
          />
          <div className="relative mx-3 mt-3 min-h-0 flex-1 overflow-hidden rounded-[20px] shadow-[0_12px_32px_-12px_rgb(0_0_0/0.7)] sm:mx-4 sm:mt-4">
            {photo}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black/65 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 top-0 p-4 sm:p-6">{title}</div>
          </div>
          <div className="relative mt-3 sm:mt-4">{bar}</div>
        </>
      ) : (
        <>
          <div className="absolute inset-0">{photo}</div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/65 via-black/20 to-transparent" />
          <div className="relative p-5 sm:p-7">{title}</div>
          <div className="relative mt-auto">{bar}</div>
        </>
      )}
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
    <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {vehicles.map((vehicle) => {
        const active = vehicle.id === selectedId;
        return (
          <button
            key={vehicle.id}
            type="button"
            onClick={() => onSelect(vehicle.id)}
            className={`pressable flex flex-shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-[0.8125rem] font-semibold transition-colors ${
              active ? "bg-foreground text-background" : "text-foreground/80"
            }`}
            style={active ? undefined : { background: "var(--segment-track)" }}
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
  const capsule =
    "pressable flex h-[30px] min-w-[76px] items-center justify-center gap-1 rounded-full px-3.5 text-[0.8125rem] font-bold disabled:opacity-50";

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={owned ? onEquip : undefined}
        disabled={!owned || isPending}
        aria-label={owned ? `${equipped ? "Remove" : "Use"} ${item.name}` : undefined}
        className={`aspect-[4/3] rounded-[16px] transition-shadow disabled:cursor-default ${item.effectClassName ?? ""} ${
          equipped ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
        }`}
        style={{ backgroundImage: item.value }}
      />
      <p className="mt-2.5 truncate text-[0.875rem] font-semibold">{item.name}</p>
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
              "Use"
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
      <header className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-muted">A backdrop for each car</p>
          <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">Customize</h1>
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

      {error && (
        <p className="mb-4 rounded-[14px] bg-danger/10 px-4 py-2.5 text-[0.875rem] text-danger">{error}</p>
      )}

      {vehicles.length > 1 && (
        <VehicleSwitcher vehicles={vehicles} selectedId={selectedId} onSelect={setSelectedId} />
      )}

      {/* See it before you buy it: the same card the garage shows,
          rendered with whichever backdrop is on this car right now. */}
      <div key={selectedId} className="animate-tab-content-in">
        <PreviewCard vehicle={selected} backdrop={equippedItem} />
      </div>
      <p className="mt-3 text-center text-[0.8125rem] text-muted">
        {equippedItem ? `${equippedItem.name} on ${selected.title}` : `No backdrop on ${selected.title} yet`}
      </p>

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-[1.375rem] font-bold tracking-[-0.02em]">Backdrops</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
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
