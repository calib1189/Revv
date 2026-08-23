"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import type { Profile } from "@/lib/db/profiles";

export function FriendsTabs({
  following,
  followers,
}: {
  following: Profile[];
  followers: Profile[];
}) {
  const [tab, setTab] = useState<"following" | "followers">("following");
  const list = tab === "following" ? following : followers;

  return (
    <div>
      <div className="glass mb-4 inline-flex rounded-full p-1">
        <button
          type="button"
          onClick={() => setTab("following")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "following"
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          Following ({following.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("followers")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "followers"
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          Followers ({followers.length})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl py-16 text-center">
          <p className="text-sm text-muted">
            {tab === "following"
              ? "You're not following anyone yet."
              : "No one follows you yet."}
          </p>
          {tab === "following" && (
            <Link href="/search" className="text-sm text-accent hover:underline">
              Find people to follow
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {list.map((profile) => (
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
      )}
    </div>
  );
}
