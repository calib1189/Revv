"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { browseParts, searchParts } from "@/lib/db/parts";
import { ProductCard } from "@/features/builds/product-card";
import { BuyButton } from "@/features/parts/buy-button";
import { Input } from "@/components/ui/input";
import { PART_CATEGORIES, getPartCategory } from "@/lib/parts/categories";
import { buildPartSearchUrl } from "@/lib/affiliate/amazon-search-link";
import { searchMarketplaceProductsAction } from "@/features/parts/marketplace-actions";
import { SearchIcon, BackIcon, ShoppingBagIcon } from "@/components/ui/icons";
import type { Part } from "@/lib/db/parts";
import type { ProductSearchResult } from "@/lib/providers/product-search-provider";

function CategoryGrid({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted">Browse by category</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PART_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className="glass flex flex-col items-center gap-2.5 rounded-2xl px-3 py-5 text-center transition-colors hover:bg-white/[0.06]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-accent">
              <c.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium leading-tight">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MarketplaceProductCard({ product }: { product: ProductSearchResult }) {
  return (
    <a
      href={product.detailPageUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="glass flex flex-col gap-2 rounded-xl p-3 transition-colors hover:bg-white/[0.06]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-raised">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, 200px"
            className="object-contain p-2"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">
            <ShoppingBagIcon className="h-6 w-6" />
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-xs font-medium">{product.title}</p>
      {product.displayPrice && (
        <p className="text-sm font-semibold text-accent">{product.displayPrice}</p>
      )}
    </a>
  );
}

function EmptyCategoryState({ categoryId }: { categoryId: string }) {
  const category = getPartCategory(categoryId);
  const label = category?.label ?? categoryId;
  const searchKeyword = category?.searchKeyword ?? null;
  const [products, setProducts] = useState<ProductSearchResult[] | null>(null);

  useEffect(() => {
    if (!searchKeyword) return;
    let cancelled = false;
    searchMarketplaceProductsAction(searchKeyword).then((response) => {
      // Mock responses are always empty by design (see
      // MockProductSearchProvider) — this check is what keeps a real
      // PA-API result from ever being confused with one, not what makes
      // the mock behave itself.
      if (!cancelled && !response.isMock) setProducts(response.results);
    });
    return () => {
      cancelled = true;
    };
  }, [searchKeyword]);

  if (products && products.length > 0 && searchKeyword) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Shop {label} on Amazon</p>
          <a
            href={buildPartSearchUrl(searchKeyword)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="text-xs text-accent hover:underline"
          >
            See more
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((product) => (
            <MarketplaceProductCard key={product.asin} product={product} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-muted">
        {category ? <category.icon className="h-5 w-5" /> : <ShoppingBagIcon className="h-5 w-5" />}
      </span>
      <p className="text-sm font-medium">
        {categoryId === "merch" ? "No merch yet — check back soon" : `No verified ${label} parts yet`}
      </p>
      <p className="max-w-xs text-xs text-muted">New listings get added here as the catalog grows.</p>
      {category?.searchKeyword && (
        <a
          href={buildPartSearchUrl(category.searchKeyword)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          <SearchIcon className="h-3.5 w-3.5" />
          Shop {label} now
        </a>
      )}
    </div>
  );
}

function PartsGrid({ parts }: { parts: Part[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {parts.map((part) => (
        <div key={part.id} className="flex flex-col gap-3">
          <ProductCard part={part} />
          <BuyButton partId={part.id} />
        </div>
      ))}
    </div>
  );
}

export function PartsBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [parts, setParts] = useState<Part[] | null>(null);

  const isSearching = query.trim().length > 0;

  useEffect(() => {
    // Category browsing itself never touches the network until a
    // category is actually picked — the "All categories" view is just
    // the grid, no fetch. Bailing out here without touching `parts` is
    // fine even if it's stale: the render below never reads it unless
    // isSearching or category is set.
    if (!isSearching && !category) return;

    let cancelled = false;
    const supabase = createClient();
    const fetchParts = isSearching
      ? searchParts(supabase, query, 24)
      : browseParts(supabase, { category: category ?? undefined });

    fetchParts.then((results) => {
      if (!cancelled) setParts(results);
    });

    return () => {
      cancelled = true;
    };
  }, [query, category, isSearching]);

  const activeCategory = !isSearching && category ? getPartCategory(category) : null;

  return (
    <div>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCategory(null);
        }}
        placeholder="Search brand or product…"
        className="mb-6"
      />

      {!isSearching && !category && <CategoryGrid onSelect={setCategory} />}

      {!isSearching && category && (
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-label="Back to categories"
            className="glass flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <BackIcon className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            {activeCategory && <activeCategory.icon className="h-4 w-4 text-accent" />}
            <h2 className="text-base font-semibold">{activeCategory?.label ?? category}</h2>
          </div>
        </div>
      )}

      {isSearching && (
        <h2 className="mb-4 text-sm font-semibold text-muted">
          {parts === null ? "Searching…" : `${parts.length} result${parts.length === 1 ? "" : "s"}`}
        </h2>
      )}

      {(isSearching || category) &&
        (parts === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : parts.length === 0 ? (
          category ? (
            <EmptyCategoryState key={category} categoryId={category} />
          ) : (
            <div className="glass rounded-2xl py-16 text-center">
              <p className="text-sm font-medium">No matches in the catalog</p>
              <p className="mt-1 text-xs text-muted">Try a different search, or browse by category instead.</p>
            </div>
          )
        ) : (
          <PartsGrid parts={parts} />
        ))}
    </div>
  );
}
