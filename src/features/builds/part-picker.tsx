"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { searchParts } from "@/lib/db/parts";
import { Label } from "@/components/ui/label";
import type { Part } from "@/lib/db/parts";

export function PartPicker({ initialPart }: { initialPart?: Part | null }) {
  const [query, setQuery] = useState(
    initialPart
      ? [initialPart.brand, initialPart.product].filter(Boolean).join(" ")
      : "",
  );
  const [results, setResults] = useState<Part[]>([]);
  const [selected, setSelected] = useState<Part | null>(initialPart ?? null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (selected || !query.trim()) return;

    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const parts = await searchParts(supabase, query);
      setResults(parts);
      setHasSearched(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, selected]);

  const trimmedQuery = query.trim();

  return (
    <div>
      <Label htmlFor="partQuery">Link a catalog part (optional)</Label>
      <input type="hidden" name="partId" value={selected?.id ?? ""} />
      <input
        id="partQuery"
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selected) setSelected(null);
        }}
        placeholder="Search brand or product…"
        className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent/60 focus:outline-none"
      />

      {selected && (
        <p className="mt-1.5 text-xs text-accent">
          Linked to {selected.brand} {selected.product} — verified data will
          show on this mod.
        </p>
      )}

      {!selected && trimmedQuery && results.length > 0 && (
        <ul className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-border">
          {results.map((part) => (
            <li key={part.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(part);
                  setResults([]);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-raised"
              >
                {part.brand} {part.product}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!selected && trimmedQuery && hasSearched && results.length === 0 && (
        <p className="mt-1.5 text-xs text-muted">
          No matching parts in the catalog yet — this will save with just
          the name you typed above.{" "}
          <Link href="/parts" className="text-accent hover:underline">
            Browse the catalog
          </Link>
        </p>
      )}
    </div>
  );
}
