"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { browseParts, searchParts } from "@/lib/db/parts";
import { ProductCard } from "@/features/builds/product-card";
import { BuyButton } from "@/features/parts/buy-button";
import { Input } from "@/components/ui/input";
import { PART_CATEGORIES, getPartCategoryLabel } from "@/lib/parts/categories";
import { buildPartSearchUrl } from "@/lib/affiliate/amazon-search-link";
import { SearchIcon } from "@/components/ui/icons";
import type { Part } from "@/lib/db/parts";

export function PartsBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [parts, setParts] = useState<Part[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const fetchParts = query.trim()
      ? searchParts(supabase, query, 24)
      : browseParts(supabase, { category: category ?? undefined });

    fetchParts.then((results) => {
      if (!cancelled) setParts(results);
    });

    return () => {
      cancelled = true;
    };
  }, [query, category]);

  const shopKeyword =
    !query.trim() && category
      ? (PART_CATEGORIES.find((c) => c.id === category)?.searchKeyword ?? null)
      : null;

  return (
    <div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search brand or product…"
        className="mb-4"
      />

      {!query.trim() && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              category === null
                ? "bg-accent text-accent-foreground"
                : "glass text-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          {PART_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                category === c.id
                  ? "bg-accent text-accent-foreground"
                  : "glass text-muted hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {parts === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : parts.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
          <p className="text-sm font-medium">
            {category === "merch"
              ? "No merch yet — check back soon"
              : category
                ? `No verified ${getPartCategoryLabel(category)} parts yet`
                : "No parts in the catalog yet"}
          </p>
          <p className="max-w-xs text-xs text-muted">
            New listings get added here as the catalog grows.
          </p>
          {category && shopKeyword && (
            <a
              href={buildPartSearchUrl(shopKeyword)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              Shop {getPartCategoryLabel(category)} now
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {parts.map((part) => (
            <div key={part.id} className="flex flex-col gap-3">
              <ProductCard part={part} />
              <BuyButton partId={part.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
