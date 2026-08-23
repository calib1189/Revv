"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { browseParts, searchParts } from "@/lib/db/parts";
import { ProductCard } from "@/features/builds/product-card";
import { BuyButton } from "@/features/parts/buy-button";
import { Input } from "@/components/ui/input";
import type { Part } from "@/lib/db/parts";

export function PartsBrowser({ categories }: { categories: string[] }) {
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

  return (
    <div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search brand or product…"
        className="mb-4"
      />

      {categories.length > 0 && !query.trim() && (
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
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                category === c
                  ? "bg-accent text-accent-foreground"
                  : "glass text-muted hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {parts === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : parts.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <p className="text-sm font-medium">No parts in the catalog yet</p>
          <p className="mt-1 text-xs text-muted">
            Verified parts get added here as the catalog grows.
          </p>
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
