"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { searchProfilesByUsername } from "@/lib/db/profiles";
import { Avatar } from "@/features/feed/avatar";
import { SearchIcon } from "@/components/ui/icons";
import type { Profile } from "@/lib/db/profiles";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const profiles = await searchProfilesByUsername(supabase, trimmed);
      setResults(profiles);
      setSearchedQuery(trimmed);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const trimmedQuery = query.trim();
  const isSearching = Boolean(trimmedQuery) && searchedQuery !== trimmedQuery;
  const hasSearched = Boolean(trimmedQuery) && searchedQuery === trimmedQuery;

  return (
    <div>
      <div className="glass-inset flex items-center gap-2 rounded-full px-4 py-2.5">
        <SearchIcon className="h-4 w-4 flex-shrink-0 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username…"
          autoFocus
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>

      {trimmedQuery && (
        <div className="mt-4">
          {isSearching ? (
            <p className="text-sm text-muted">Searching…</p>
          ) : results.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border">
              {results.map((profile) => (
                <li key={profile.id}>
                  <Link
                    href={`/u/${profile.username}`}
                    className="flex items-center gap-3 py-3 hover:opacity-80"
                  >
                    <Avatar username={profile.username} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">@{profile.username}</p>
                      {profile.bio && (
                        <p className="truncate text-xs text-muted">{profile.bio}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : hasSearched ? (
            <p className="text-sm text-muted">No users found for &ldquo;{trimmedQuery}&rdquo;.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
