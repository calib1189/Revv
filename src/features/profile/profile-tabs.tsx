"use client";

import { useState } from "react";
import { PostThumbnailGrid, type PostThumbnail } from "@/features/profile/post-thumbnail-grid";
import { VehicleBay } from "@/features/garage/vehicle-bay";
import { AchievementsGrid } from "@/features/achievements/achievements-grid";
import { AchievementShowcaseEditor } from "@/features/achievements/achievement-showcase-editor";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import type { Vehicle } from "@/lib/db/vehicles";

export interface ProfileVehicleItem {
  vehicle: Vehicle;
  heroUrl: string | null;
  ratingScore: number | null;
}

type Tab = "posts" | "garage" | "achievements" | "saved" | "liked";

interface TabDef {
  key: Tab;
  label: string;
}

const EmptyTab = EmptyState;

export function ProfileTabs({
  posts,
  vehicles,
  unlockedAtById,
  claimedAtById,
  showcasedAchievementIds,
  savedPosts,
  likedPosts,
  isOwnProfile,
  vehicleNameColorValue,
  vehicleNameColorEffectClassName,
}: {
  posts: PostThumbnail[];
  vehicles: ProfileVehicleItem[];
  unlockedAtById: Map<string, string>;
  /** Only passed for the owner's own profile — see achievements-grid.tsx. */
  claimedAtById?: Map<string, string>;
  showcasedAchievementIds: string[];
  savedPosts?: PostThumbnail[];
  likedPosts?: PostThumbnail[];
  isOwnProfile: boolean;
  /** This profile's equipped Garage Shop Nameplate Color, if any — same
   * cosmetic shown on the owner's own /garage, applied here too so a
   * visitor sees it on the public Garage tab, not just the owner. */
  vehicleNameColorValue?: string;
  vehicleNameColorEffectClassName?: string;
}) {
  const [tab, setTab] = useState<Tab>("posts");

  const tabs: TabDef[] = [
    { key: "posts", label: "Posts" },
    { key: "garage", label: "Garage" },
    { key: "achievements", label: "Awards" },
    ...(isOwnProfile
      ? ([
          { key: "saved", label: "Saved" },
          { key: "liked", label: "Liked" },
        ] as TabDef[])
      : []),
  ];

  return (
    <div className="mt-8">
      <SegmentedControl
        options={tabs.map((t) => ({ value: t.key, label: t.label }))}
        value={tab}
        onChange={setTab}
      />

      {/* Remounted per tab (key={tab}) purely for the fade-in — a tab
          switch should feel like new content settling in, not an
          instant, jarring swap. */}
      <div key={tab} className="mt-5 animate-tab-content-in">
        {tab === "posts" &&
          (posts.length === 0 ? (
            <EmptyTab
              title="No posts yet"
              body={isOwnProfile ? "Share a photo of your car to start your feed." : "Nothing shared here yet."}
            />
          ) : (
            <PostThumbnailGrid posts={posts} />
          ))}

        {tab === "garage" &&
          (vehicles.length === 0 ? (
            <EmptyTab
              title="No vehicles yet"
              body={isOwnProfile ? "Add a car to your garage and it shows up here." : "No cars in this garage yet."}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {vehicles.map(({ vehicle, heroUrl, ratingScore }) => (
                <VehicleBay
                  key={vehicle.id}
                  vehicle={vehicle}
                  heroUrl={heroUrl}
                  ratingScore={ratingScore}
                  nameColorValue={vehicleNameColorValue}
                  nameColorEffectClassName={vehicleNameColorEffectClassName}
                />
              ))}
            </div>
          ))}

        {tab === "achievements" && (
          <div className="flex flex-col gap-4">
            {isOwnProfile && (
              <AchievementShowcaseEditor
                initialShowcasedIds={showcasedAchievementIds}
                unlockedAtById={unlockedAtById}
              />
            )}
            <AchievementsGrid unlockedAtById={unlockedAtById} claimedAtById={claimedAtById} />
          </div>
        )}

        {tab === "saved" &&
          isOwnProfile &&
          ((savedPosts?.length ?? 0) === 0 ? (
            <EmptyTab title="Nothing saved" body="Posts you save will show up here." />
          ) : (
            <PostThumbnailGrid posts={savedPosts!} />
          ))}

        {tab === "liked" &&
          isOwnProfile &&
          ((likedPosts?.length ?? 0) === 0 ? (
            <EmptyTab title="No likes yet" body="Posts you like will show up here." />
          ) : (
            <PostThumbnailGrid posts={likedPosts!} />
          ))}
      </div>
    </div>
  );
}
