"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { PointsWallet } from "@/features/store/points-packs";
import { LookPreview, StyledName, type Look, type LookScope } from "@/features/store/look-preview";
import { ItemTile, CATEGORY_KIND } from "@/features/store/item-tile";
import { purchaseItemAction, equipItemAction } from "@/features/store/actions";
import { equipCrewItemAction } from "@/features/crews/actions";
import { DecalSheet, type DecalOffer } from "@/features/decals/decal-sheet";
import { PosterSheet } from "@/features/posters/poster-card";
import { TeeSheet } from "@/features/shop/tee-sheet";
import { PRODUCT_STAGE, PosterPrint, StickerArt, TeeStill } from "@/features/shop/product-art";
import type { PosterOffer } from "@/lib/posters/offer";
import { TEE_DESIGNS, TEE_FROM_CENTS, type TeeDesign } from "@/lib/merch/products";
import { listStoreItemsByCategory, getStoreItem, STORE_CATEGORY_LABELS, type StoreCategory, type StoreItem } from "@/lib/store/catalog";
import { RARITY_COLOR, RARITY_LABEL, rarityFor } from "@/lib/store/rarity";
import { featuredItem } from "@/lib/store/featured";
import { RANK_LABELS } from "@/lib/rating/rank";
import { formatUsd } from "@/lib/points/packs";
import type { ShopOrder } from "@/lib/db/shop-orders";
import {
  CheckIcon,
  CloseIcon,
  FlagIcon,
  GemIcon,
  SearchIcon,
  ShoppingBagIcon,
  StarIcon,
  WheelIcon,
} from "@/components/ui/icons";

type Equipped = Partial<Record<StoreCategory, string | null>>;
type Scope = LookScope;
type Section = "all" | "tees" | "car" | "name" | "background" | "frame" | "crew" | "owned";

export interface OwnedCrewOption {
  id: string;
  name: string;
  equipped: Equipped;
}

const SECTIONS: { id: Section; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tees", label: "Tees" },
  { id: "car", label: "For your car" },
  { id: "name", label: "Name colors" },
  { id: "background", label: "Backgrounds" },
  { id: "frame", label: "Frames" },
  { id: "crew", label: "Crew" },
  { id: "owned", label: "Owned" },
];

const SECTION_CATEGORIES: Partial<Record<Section, StoreCategory[]>> = {
  name: ["name_color", "vehicle_name_color"],
  background: ["profile_background"],
  frame: ["showcase_frame"],
  crew: ["crew_name_color", "crew_banner", "crew_frame"],
};

/** Every cosmetic sold here (garage backdrops are bought per car in the
 * Garage Editor, so they're not). */
const COSMETIC_CATEGORIES: StoreCategory[] = ["name_color", "vehicle_name_color", "profile_background", "showcase_frame", "crew_name_color", "crew_banner", "crew_frame"];
const CREW_CATEGORIES = new Set<StoreCategory>(["crew_name_color", "crew_banner", "crew_frame"]);

/** Which look a cosmetic changes, for its try-on preview. */
function scopeOf(category: StoreCategory): Scope {
  if (CREW_CATEGORIES.has(category)) return "crew";
  if (category === "vehicle_name_color" || category === "garage_backdrop") return "garage";
  return "profile";
}

const LOOK_SLOTS: Record<Scope, { text: StoreCategory; background?: StoreCategory; ring?: StoreCategory }> = {
  profile: { text: "name_color", background: "profile_background", ring: "showcase_frame" },
  garage: { text: "vehicle_name_color" },
  crew: { text: "crew_name_color", background: "crew_banner", ring: "crew_frame" },
};

type Product =
  | { kind: "tee"; key: string; design: TeeDesign }
  | { kind: "decal"; key: string; offer: DecalOffer }
  | { kind: "poster"; key: string; offer: PosterOffer }
  | { kind: "cosmetic"; key: string; item: StoreItem };

const searchText = (p: Product): string =>
  p.kind === "tee"
    ? `${p.design.name} tee shirt ${p.design.color}`
    : p.kind === "decal"
      ? `${RANK_LABELS[p.offer.tier]} rank decal sticker ${p.offer.carName}`
      : p.kind === "poster"
        ? `build poster print ${p.offer.carName}`
        : `${p.item.name} ${STORE_CATEGORY_LABELS[p.item.category]}`;

/**
 * The shop. A bold red header (search, points, shortcuts), a "shop by"
 * row of bubbles, featured promos, then everything in one grid under
 * category tabs: SORZA tees, prints for your car, and the cosmetics.
 * Tapping anything opens its own sheet: a 3D tee to spin, the decal on
 * your car, the poster, or a cosmetic tried on your own profile.
 */
export function ShopHome({
  userId,
  initialBalance,
  initialOwnedItemIds,
  profilePreviewLabel,
  profileEquipped,
  garagePreviewLabel,
  garageEquipped,
  crews,
  isFounder = false,
  packsEnabled,
  week,
  decals,
  posters,
  decalPriceCents,
  showTees,
  orders,
}: {
  userId: string;
  initialBalance: number;
  initialOwnedItemIds: string[];
  profilePreviewLabel: string;
  profileEquipped: Equipped;
  garagePreviewLabel: string;
  garageEquipped: Equipped;
  crews: OwnedCrewOption[];
  isFounder?: boolean;
  packsEnabled: boolean;
  week: number;
  /** Rank decals the viewer's cars earned (empty while decals are off). */
  decals: DecalOffer[];
  /** Build posters the viewer's cars can have (empty while posters are off). */
  posters: PosterOffer[];
  decalPriceCents: number;
  showTees: boolean;
  orders: ShopOrder[];
}) {
  const params = useSearchParams();
  const teeOrdered = params.get("tee") === "ordered";
  const [balance, setBalance] = useState(initialBalance);
  const [owned, setOwned] = useState(new Set(initialOwnedItemIds));
  const [equipped, setEquipped] = useState<Equipped>({ ...profileEquipped, ...garageEquipped, ...(crews[0]?.equipped ?? {}) });
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(crews[0]?.id ?? null);
  const [section, setSection] = useState<Section>(teeOrdered ? "tees" : "all");
  const [query, setQuery] = useState("");
  const [walletOpen, setWalletOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Each kind of sheet keeps its item after closing, so it can slide away.
  const [cosmetic, setCosmetic] = useState<StoreItem | null>(null);
  const [cosmeticOpen, setCosmeticOpen] = useState(false);
  const [tee, setTee] = useState<TeeDesign | null>(null);
  const [teeOpen, setTeeOpen] = useState(false);
  const [decal, setDecal] = useState<DecalOffer | null>(null);
  const [decalOpen, setDecalOpen] = useState(false);
  const [poster, setPoster] = useState<PosterOffer | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const selectedCrew = crews.find((c) => c.id === selectedCrewId) ?? null;
  const labels: Record<Scope, string> = { profile: profilePreviewLabel, garage: garagePreviewLabel, crew: selectedCrew?.name ?? "Your Crew" };
  const featured = featuredItem(["name_color", "profile_background", "showcase_frame"], week);
  const activeOrders = orders.filter((o) => o.status !== "problem").length;

  function lookFor(scope: Scope, tryOn: StoreItem | null = null): Look {
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
    if (CREW_CATEGORIES.has(item.category) && !selectedCrewId) {
      setError("Create a crew to wear crew cosmetics.");
      return;
    }
    const action = CREW_CATEGORIES.has(item.category) ? equipCrewItemAction.bind(null, selectedCrewId!) : equipItemAction;
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

  function selectCrew(crewId: string) {
    setSelectedCrewId(crewId);
    const crew = crews.find((c) => c.id === crewId);
    if (crew) setEquipped((prev) => ({ ...prev, ...crew.equipped }));
  }

  function goTo(next: Section) {
    setSection(next);
    setQuery("");
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function open(p: Product) {
    if (p.kind === "tee") {
      setTee(p.design);
      setTeeOpen(true);
    } else if (p.kind === "decal") {
      setDecal(p.offer);
      setDecalOpen(true);
    } else if (p.kind === "poster") {
      setPoster(p.offer);
      setPosterOpen(true);
    } else {
      setCosmetic(p.item);
      setCosmeticOpen(true);
    }
  }

  // Everything for sale, in shop order.
  const all = useMemo<Product[]>(() => {
    const tees: Product[] = showTees ? TEE_DESIGNS.map((design) => ({ kind: "tee", key: `tee:${design.id}`, design })) : [];
    const car: Product[] = [
      ...decals.map((offer): Product => ({ kind: "decal", key: `decal:${offer.vehicleId}`, offer })),
      ...posters.map((offer): Product => ({ kind: "poster", key: `poster:${offer.vehicleId}`, offer })),
    ];
    const cosmetics: Product[] = COSMETIC_CATEGORIES.flatMap((c) => listStoreItemsByCategory(c, { includeFounderOnly: isFounder })).map(
      (item): Product => ({ kind: "cosmetic", key: `item:${item.id}`, item }),
    );
    return [...tees, ...car, ...cosmetics];
  }, [showTees, decals, posters, isFounder]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return all.filter((p) => searchText(p).toLowerCase().includes(q));
    const cats = SECTION_CATEGORIES[section];
    let list: Product[];
    if (section === "all") {
      // Physical things first, then this week's featured piece and the
      // rarest cosmetics, then the rest cheapest first.
      const physical = all.filter((p) => p.kind !== "cosmetic");
      const items = all
        .filter((p): p is Extract<Product, { kind: "cosmetic" }> => p.kind === "cosmetic")
        .sort((a, b) => (a.item.id === featured?.id ? -1 : b.item.id === featured?.id ? 1 : b.item.price - a.item.price));
      list = [...physical, ...items];
    } else if (section === "tees") list = all.filter((p) => p.kind === "tee");
    else if (section === "car") list = all.filter((p) => p.kind === "decal" || p.kind === "poster");
    else if (section === "owned") list = all.filter((p) => p.kind === "cosmetic" && owned.has(p.item.id));
    else list = all.filter((p) => p.kind === "cosmetic" && cats!.includes(p.item.category)).sort((a, b) => (a.kind === "cosmetic" && b.kind === "cosmetic" ? a.item.price - b.item.price : 0));
    return list;
  }, [all, section, query, owned, featured]);

  const bestDecal = decals[0] ?? null;

  return (
    <div className="flex flex-col">
      {/* The header: title and points, search, shortcuts. */}
      <header>
        <PointsWallet
          title={<h1 className="text-[2.125rem] font-bold leading-none tracking-[-0.03em] sm:text-[2.75rem]">Shop</h1>}
          balance={balance}
          userId={userId}
          packsEnabled={packsEnabled}
          open={walletOpen}
          onOpenChange={setWalletOpen}
        />

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="mt-4 flex h-12 items-center gap-2.5 rounded-full bg-foreground/[0.06] pl-4 pr-1.5 ring-1 ring-border transition-shadow focus-within:ring-2 focus-within:ring-foreground/25"
        >
          <SearchIcon className="h-[18px] w-[18px] flex-shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tees, decals, colors"
            aria-label="Search the shop"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-muted"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:text-foreground">
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Shortcut label="Orders" dot={activeOrders > 0} onClick={() => setOrdersOpen(true)} icon={<ShoppingBagIcon className="h-4 w-4" />} />
          <Shortcut label="My items" onClick={() => goTo("owned")} icon={<CheckIcon className="h-4 w-4" />} />
          {packsEnabled && <Shortcut label="Get points" onClick={() => setWalletOpen(true)} icon={<GemIcon className="h-4 w-4" />} />}
          <Shortcut label="Earn free" href="/daily" icon={<StarIcon className="h-4 w-4" />} />
        </div>
      </header>

      {/* Shop by: one bubble per kind of thing. */}
      <div className="no-scrollbar -mx-4 mt-6 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        {showTees && (
          <Bubble label="Tees" hot onClick={() => goTo("tees")}>
            <TeeStill design="big-s" alt="" className="h-[86%] w-[86%] translate-y-[4%]" />
          </Bubble>
        )}
        {(decals.length > 0 || posters.length > 0) && (
          <Bubble label="Your car" hot onClick={() => goTo("car")}>
            {bestDecal ? <StickerArt tier={bestDecal.tier} className="h-[74%] w-[74%]" /> : <WheelIcon className="h-7 w-7 text-white/80" />}
          </Bubble>
        )}
        <Bubble label="Names" onClick={() => goTo("name")}>
          <span className="bg-[linear-gradient(135deg,#ffd60a,#ff375f_45%,#bf5af2)] bg-clip-text text-[1.375rem] font-extrabold text-transparent">Aa</span>
        </Bubble>
        <Bubble label="Backgrounds" onClick={() => goTo("background")}>
          <span className="h-full w-full bg-[linear-gradient(135deg,#0a84ff,#bf5af2_55%,#ff375f)]" />
        </Bubble>
        <Bubble label="Frames" onClick={() => goTo("frame")}>
          <span className="h-[62%] w-[62%] rounded-full ring-[3px] ring-[#ffd60a] ring-offset-2 ring-offset-[#16161a]" />
        </Bubble>
        <Bubble label="Crew" onClick={() => goTo("crew")}>
          <FlagIcon className="h-6 w-6 text-white/85" />
        </Bubble>
        <Bubble label="Owned" onClick={() => goTo("owned")}>
          <CheckIcon className="h-6 w-6 text-white/85" />
        </Bubble>
      </div>

      {teeOrdered && (
        <p className="mt-4 rounded-[16px] bg-[#34c759]/12 px-4 py-3 text-[0.875rem] font-medium text-[#34c759]" role="status">
          Order placed. Your shirt is printed to order and you&apos;ll get an email when it ships.
        </p>
      )}

      {/* Featured promos. */}
      <div className="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {showTees && (
          <Promo eyebrow="New drop" title="SORZA Tees" sub={`Heavy cotton · from ${formatUsd(TEE_FROM_CENTS)}`} tone="#e1141f" onClick={() => goTo("tees")}>
            {TEE_DESIGNS.slice(0, 2).map((d) => (
              <MiniTile
                key={d.id}
                label={formatUsd(TEE_FROM_CENTS)}
                onClick={() => {
                  setTee(d);
                  setTeeOpen(true);
                }}
              >
                <TeeStill design={d.id} alt={d.name} className="h-[92%] w-[92%]" />
              </MiniTile>
            ))}
          </Promo>
        )}
        {featured && (
          <Promo eyebrow="Featured this week" title={featured.name} sub={`${RARITY_LABEL[rarityFor(featured.price, featured.founderOnly)]} ${STORE_CATEGORY_LABELS[featured.category].toLowerCase()}`} tone={RARITY_COLOR[rarityFor(featured.price, featured.founderOnly)]} onClick={() => open({ kind: "cosmetic", key: featured.id, item: featured })}>
            <MiniTile
              wide
              label={owned.has(featured.id) ? "Owned" : `${featured.price.toLocaleString()} pts`}
              onClick={() => open({ kind: "cosmetic", key: featured.id, item: featured })}
            >
              <span className="absolute inset-0">
                <ItemTile item={featured} previewLabel={labels[scopeOf(featured.category)]} />
              </span>
            </MiniTile>
          </Promo>
        )}
        {(decals.length > 0 || posters.length > 0) && (
          <Promo eyebrow="Made for your car" title="Rank decals & posters" sub="Printed and shipped free in the US" tone="#ffd60a" onClick={() => goTo("car")}>
            {bestDecal && (
              <MiniTile label={formatUsd(decalPriceCents)} onClick={() => open({ kind: "decal", key: "d", offer: bestDecal })}>
                <StickerArt tier={bestDecal.tier} className="h-[72%] w-[72%]" />
              </MiniTile>
            )}
            {posters[0] && (
              <MiniTile label="Poster" onClick={() => open({ kind: "poster", key: "p", offer: posters[0] })}>
                <PosterPrint offer={posters[0]} width={300} className="h-[80%]" />
              </MiniTile>
            )}
          </Promo>
        )}
      </div>

      {/* Category tabs, pinned while you scroll the grid. */}
      <div ref={tabsRef} className="sticky top-0 z-20 -mx-4 mt-5 scroll-mt-0 border-b border-border bg-background/92 px-4 backdrop-blur-xl sm:mx-0 sm:px-0">
        <nav className="no-scrollbar flex gap-6 overflow-x-auto" aria-label="Shop sections">
          {SECTIONS.filter((s) => (s.id === "tees" ? showTees : s.id === "car" ? decals.length > 0 || posters.length > 0 : true)).map((s) => {
            const active = !query && section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSection(s.id);
                  setQuery("");
                }}
                aria-current={active ? "true" : undefined}
                className={`relative flex-shrink-0 py-3 text-[0.9375rem] font-bold transition-colors ${
                  active ? "text-foreground" : s.id === "tees" ? "text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                {s.label}
                {active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-foreground" />}
              </button>
            );
          })}
        </nav>
      </div>

      {section === "crew" && !query && crews.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {crews.map((crew) => (
            <button
              key={crew.id}
              type="button"
              onClick={() => selectCrew(crew.id)}
              className={`pressable flex-shrink-0 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                selectedCrewId === crew.id ? "bg-foreground text-background" : "bg-foreground/[0.06] text-foreground/75"
              }`}
            >
              {crew.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 rounded-[14px] bg-danger/10 px-4 py-2.5 text-[0.875rem] text-danger">{error}</p>}

      {/* The grid: two staggered columns, filled left, right, left… so it
          reads in order. */}
      <div className="mt-4 flex gap-3">
        {[0, 1].map((col) => (
          <div key={col} className="flex min-w-0 flex-1 flex-col">
            {visible
              .filter((_, i) => i % 2 === col)
              .map((p) => (
                <ProductCard
                  key={p.key}
                  product={p}
                  owned={p.kind === "cosmetic" && owned.has(p.item.id)}
                  equipped={p.kind === "cosmetic" && equipped[p.item.category] === p.item.id}
                  featured={p.kind === "cosmetic" && p.item.id === featured?.id}
                  previewLabel={p.kind === "cosmetic" ? labels[scopeOf(p.item.category)] : ""}
                  decalPriceCents={decalPriceCents}
                  onOpen={() => open(p)}
                />
              ))}
          </div>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-[1rem] font-semibold">{query ? `Nothing matches "${query.trim()}"` : section === "owned" ? "Nothing here yet" : "Nothing here yet"}</p>
          <p className="max-w-xs text-[0.875rem] text-muted">
            {query ? "Try another word, like tee, decal or a color." : section === "owned" ? "Cosmetics you buy or earn show up here." : "Check back soon."}
          </p>
          {section === "crew" && crews.length === 0 && (
            <Link href="/crews/new" className="pressable mt-2 rounded-full bg-accent px-5 py-2.5 text-[0.875rem] font-semibold text-accent-foreground">
              Create a crew
            </Link>
          )}
        </div>
      )}

      {/* Sheets. */}
      {tee && <TeeSheet key={tee.id} design={tee} open={teeOpen} onClose={() => setTeeOpen(false)} />}
      {decal && <DecalSheet offer={decal} priceCents={decalPriceCents} open={decalOpen} onClose={() => setDecalOpen(false)} />}
      {poster && <PosterSheet offer={poster} open={posterOpen} onClose={() => setPosterOpen(false)} />}
      <Sheet open={cosmeticOpen} onClose={() => setCosmeticOpen(false)} title={cosmetic ? STORE_CATEGORY_LABELS[cosmetic.category] : ""}>
        {cosmetic && (
          <ItemDetail
            item={cosmetic}
            scope={scopeOf(cosmetic.category)}
            label={labels[scopeOf(cosmetic.category)]}
            look={lookFor(scopeOf(cosmetic.category), cosmetic)}
            owned={owned.has(cosmetic.id)}
            equipped={equipped[cosmetic.category] === cosmetic.id}
            balance={balance}
            pending={pendingId === cosmetic.id}
            packsEnabled={packsEnabled}
            onBuy={() => buy(cosmetic)}
            onEquip={() => equip(cosmetic)}
            onGetPoints={() => {
              setCosmeticOpen(false);
              setWalletOpen(true);
            }}
          />
        )}
      </Sheet>
      <Sheet open={ordersOpen} onClose={() => setOrdersOpen(false)} title="Orders">
        <OrdersList orders={orders} />
      </Sheet>
    </div>
  );
}

function Shortcut({ label, icon, onClick, href, dot }: { label: string; icon: React.ReactNode; onClick?: () => void; href?: string; dot?: boolean }) {
  const cls = "pressable relative flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-foreground/[0.05] px-3.5 text-[0.8125rem] font-semibold ring-1 ring-border";
  const inner = (
    <>
      {icon}
      {label}
      {dot && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background" />}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Bubble({ label, hot, onClick, children }: { label: string; hot?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="pressable flex w-[4.75rem] flex-shrink-0 flex-col items-center gap-1.5">
      <span className={`rounded-full p-[2.5px] ${hot ? "bg-accent" : "bg-foreground/15"}`}>
        <span className="block rounded-full bg-background p-[2px]">
          <span className="flex h-[3.75rem] w-[3.75rem] items-center justify-center overflow-hidden rounded-full bg-[#16161a]">{children}</span>
        </span>
      </span>
      <span className="w-full truncate text-center text-[0.75rem] font-semibold">{label}</span>
    </button>
  );
}

function Promo({
  eyebrow,
  title,
  sub,
  tone,
  onClick,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  tone: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="relative flex w-[84%] max-w-[360px] flex-shrink-0 snap-start flex-col self-start overflow-hidden rounded-[24px] bg-surface p-4 ring-1 ring-border">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-25 blur-3xl" style={{ background: tone }} />
      <button type="button" onClick={onClick} className="relative text-left">
        <p className="text-[0.75rem] font-bold uppercase tracking-[0.08em]" style={{ color: tone }}>
          {eyebrow}
        </p>
        <p className="mt-1 line-clamp-1 text-[1.375rem] font-extrabold leading-tight tracking-[-0.02em]">{title}</p>
        <p className="mt-0.5 text-[0.8125rem] text-muted">{sub}</p>
      </button>
      <div className="relative mt-3 flex gap-2.5">{children}</div>
    </section>
  );
}

function MiniTile({ label, wide, onClick, children }: { label: string; wide?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pressable relative flex h-[132px] min-w-0 items-center justify-center overflow-hidden rounded-[16px] bg-[radial-gradient(70%_60%_at_50%_35%,#34343b,#141417_75%)] ${wide ? "flex-[2]" : "flex-1"}`}
    >
      {children}
      <span className="numeral absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-[0.75rem] font-bold text-black shadow">{label}</span>
    </button>
  );
}

function ProductCard({
  product,
  owned,
  equipped,
  featured,
  previewLabel,
  decalPriceCents,
  onOpen,
}: {
  product: Product;
  owned: boolean;
  equipped: boolean;
  featured: boolean;
  previewLabel: string;
  decalPriceCents: number;
  onOpen: () => void;
}) {
  let media: React.ReactNode;
  let aspect = "aspect-square";
  let title: string;
  let price: React.ReactNode;
  let badge: React.ReactNode = null;
  const shipping = <span className="rounded-[6px] bg-[#34c759]/15 px-1.5 py-0.5 text-[0.6875rem] font-bold text-[#34c759]">Free shipping</span>;

  if (product.kind === "tee") {
    aspect = "aspect-[4/5]";
    title = `${product.design.name} Tee`;
    media = (
      <span className={`absolute inset-0 flex items-center justify-center ${PRODUCT_STAGE}`}>
        <TeeStill design={product.design.id} alt={title} className="h-[86%] w-[86%]" />
      </span>
    );
    price = <Price usd={TEE_FROM_CENTS} />;
    badge = shipping;
  } else if (product.kind === "decal") {
    title = `${RANK_LABELS[product.offer.tier]} rank decal · ${product.offer.carName}`;
    media = (
      <span className={`absolute inset-0 flex items-center justify-center ${PRODUCT_STAGE}`}>
        <StickerArt tier={product.offer.tier} className="h-[70%] w-[70%]" />
      </span>
    );
    price = <Price usd={decalPriceCents} />;
    badge = shipping;
  } else if (product.kind === "poster") {
    aspect = "aspect-[4/5]";
    title = `Build poster · ${product.offer.carName}`;
    media = (
      <span className={`absolute inset-0 flex items-center justify-center ${PRODUCT_STAGE}`}>
        <PosterPrint offer={product.offer} className="h-[82%]" />
      </span>
    );
    const sharp = product.offer.products.filter((p) => p.sharp).map((p) => p.priceCents);
    price = sharp.length > 0 ? <Price usd={Math.min(...sharp)} from /> : <span className="text-[0.75rem] text-muted">Photo too small</span>;
    badge = shipping;
  } else {
    const item = product.item;
    const kind = CATEGORY_KIND[item.category];
    aspect = kind === "background" ? "aspect-[4/5]" : "aspect-square";
    title = item.name;
    const rarity = rarityFor(item.price, item.founderOnly);
    media = (
      <span className="absolute inset-0">
        <ItemTile item={item} previewLabel={previewLabel} />
      </span>
    );
    badge = (
      <span className="rounded-[6px] px-1.5 py-0.5 text-[0.6875rem] font-bold" style={{ color: RARITY_COLOR[rarity], background: `color-mix(in srgb, ${RARITY_COLOR[rarity]} 14%, transparent)` }}>
        {RARITY_LABEL[rarity]}
      </span>
    );
    price = owned ? (
      <span className="flex items-center gap-1 text-[0.875rem] font-bold">
        {equipped && <CheckIcon className="h-3.5 w-3.5 text-accent" />}
        {equipped ? "Wearing" : "Owned"}
      </span>
    ) : (
      <span className="numeral flex items-center gap-1 text-[1.0625rem] font-extrabold">
        <GemIcon className="h-3.5 w-3.5 text-accent" />
        {item.price.toLocaleString()}
      </span>
    );
  }

  return (
    <button type="button" onClick={onOpen} className="pressable mb-3 flex w-full flex-col overflow-hidden rounded-[16px] bg-surface text-left ring-1 ring-border">
      <span className={`relative block w-full overflow-hidden ${aspect} ${equipped ? "ring-2 ring-inset ring-accent" : ""}`}>
        {media}
        {featured && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[0.625rem] font-extrabold uppercase tracking-[0.06em] text-white">Featured</span>
        )}
      </span>
      <span className="flex flex-col gap-1.5 p-2.5">
        <span className="line-clamp-2 text-[0.875rem] font-semibold leading-snug">{title}</span>
        {badge && <span className="flex">{badge}</span>}
        <span className="flex items-baseline justify-between gap-2">{price}</span>
      </span>
    </button>
  );
}

function Price({ usd, from }: { usd: number; from?: boolean }) {
  const [dollars, cents] = (usd / 100).toFixed(2).split(".");
  return (
    <span className="numeral flex items-baseline font-extrabold">
      {from && <span className="mr-1 text-[0.6875rem] font-semibold text-muted">from</span>}
      <span className="text-[0.75rem]">$</span>
      <span className="text-[1.125rem] leading-none">{dollars}</span>
      <span className="text-[0.75rem]">.{cents}</span>
    </span>
  );
}

const ORDER_STATUS: Record<ShopOrder["status"], { label: string; color: string }> = {
  processing: { label: "Processing", color: "#ffd60a" },
  printing: { label: "Sent to printer", color: "#34c759" },
  problem: { label: "Needs attention", color: "#ff453a" },
};

function OrdersList({ orders }: { orders: ShopOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <ShoppingBagIcon className="h-8 w-8 text-muted" />
        <p className="text-[0.9375rem] font-semibold">No orders yet</p>
        <p className="max-w-xs text-[0.8125rem] text-muted">Tees, decals and posters you order show up here.</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2 pb-2">
      {orders.map((o) => (
        <li key={o.id} className="flex items-center gap-3 rounded-[18px] bg-foreground/[0.04] p-3 ring-1 ring-border">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] bg-foreground/[0.06]">
            {o.kind === "tee" ? <ShoppingBagIcon className="h-5 w-5" /> : o.kind === "decal" ? <GemIcon className="h-5 w-5" /> : <StarIcon className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-semibold">{o.title}</span>
            <span className="block truncate text-[0.75rem] text-muted">
              {o.detail ? `${o.detail} · ` : ""}
              {new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {formatUsd(o.amountCents)}
            </span>
          </span>
          <span className="flex flex-shrink-0 items-center gap-1.5 text-[0.75rem] font-semibold" style={{ color: ORDER_STATUS[o.status].color }}>
            <span className="h-2 w-2 rounded-full" style={{ background: ORDER_STATUS[o.status].color }} />
            {ORDER_STATUS[o.status].label}
          </span>
        </li>
      ))}
      {orders.some((o) => o.status === "problem") && (
        <p className="px-1 pt-1 text-[0.75rem] text-muted">
          Something went wrong with an order? <Link href="/legal/support" className="font-semibold text-accent">Contact support</Link> and we&apos;ll sort it.
        </p>
      )}
    </ul>
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
  scope: Scope;
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
  const kind = CATEGORY_KIND[item.category];
  return (
    <div className="flex flex-col gap-4 pb-1">
      <LookPreview scope={scope} label={label} look={look} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[1.375rem] font-bold leading-tight tracking-[-0.02em]">
            {kind === "text" ? <StyledName item={item}>{item.name}</StyledName> : item.name}
          </p>
          <p className="mt-1 text-[0.75rem] font-bold uppercase tracking-[0.1em]" style={{ color: RARITY_COLOR[rarity] }}>
            {RARITY_LABEL[rarity]} · {kind === "text" ? "Color" : kind === "background" ? "Background" : "Frame"}
          </p>
        </div>
        {!owned && (
          <p className="numeral flex flex-shrink-0 items-center gap-1.5 text-[1.375rem] font-bold">
            <GemIcon className="h-4 w-4 text-accent" />
            {item.price.toLocaleString()}
          </p>
        )}
      </div>
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
          {equipped ? "Wearing it. Tap to take off" : "Wear it"}
        </button>
      ) : short <= 0 ? (
        <button
          type="button"
          disabled={pending}
          onClick={onBuy}
          className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-semibold text-accent-foreground disabled:opacity-60"
        >
          Buy for <GemIcon className="h-4 w-4" /> <span className="numeral">{item.price.toLocaleString()}</span>
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="numeral text-center text-[0.875rem] font-semibold">You need {short.toLocaleString()} more points</p>
          {packsEnabled ? (
            <button type="button" onClick={onGetPoints} className="pressable flex h-12 w-full items-center justify-center rounded-full bg-accent text-[0.9375rem] font-semibold text-accent-foreground">
              Get points
            </button>
          ) : (
            <Link href="/daily" className="pressable flex h-12 w-full items-center justify-center rounded-full bg-foreground/[0.08] text-[0.9375rem] font-semibold">
              Earn points in Sorza Daily
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
