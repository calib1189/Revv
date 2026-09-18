"use client";

import { useState } from "react";
import Link from "next/link";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { UsersIcon } from "@/components/ui/icons";
import { PeopleList } from "@/features/profile/people-list";
import type { Profile } from "@/lib/db/profiles";

export function FriendsTabs({
  following,
  followers,
  avatarUrlById,
}: {
  following: Profile[];
  followers: Profile[];
  avatarUrlById?: Record<string, string | null>;
}) {
  const [tab, setTab] = useState<"following" | "followers">("following");
  const list = tab === "following" ? following : followers;

  return (
    <div>
      <SegmentedControl
        className="mb-5"
        options={[
          { value: "following", label: `Following · ${following.length}` },
          { value: "followers", label: `Followers · ${followers.length}` },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div key={tab} className="animate-tab-content-in">
        {list.length === 0 ? (
          <EmptyState
            card
            icon={<UsersIcon />}
            title={tab === "following" ? "Not following anyone yet" : "No followers yet"}
            body={
              tab === "following"
                ? "Find builders you like and follow them to fill your feed."
                : "Post your build and people will find you."
            }
            action={
              tab === "following" ? (
                <Link href="/search">
                  <Button className="px-5">Find people</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <PeopleList profiles={list} avatarUrlById={avatarUrlById} />
        )}
      </div>
    </div>
  );
}
