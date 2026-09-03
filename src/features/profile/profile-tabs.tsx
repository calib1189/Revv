"use client";

import { useState } from "react";
import { PostThumbnailGrid, type PostThumbnail } from "@/features/profile/post-thumbnail-grid";
import { VehicleCard } from "@/features/garage/vehicle-card";
import { AchievementsGrid } from "@/features/achievements/achievements-grid";
import type { Vehicle } from "@/lib/db/vehicles";

export interface ProfileVehicleItem {
  vehicle: Vehicle;
  heroUrl: string | null;
  ratingScore: number | null;
}

type Tab = "posts" | "garage" | "achievements" | "saved" | "liked";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function ProfileTabs({
  posts,
  vehicles,
  unlockedAtById,
  savedPosts,
  likedPosts,
  isOwnProfile,
}: {
  posts: PostThumbnail[];
  vehicles: ProfileVehicleItem[];
  unlockedAtById: Map<string, string>;
  savedPosts?: PostThumbnail[];
  likedPosts?: PostThumbnail[];
  isOwnProfile: boolean;
}) {
  const [tab, setTab] = useState<Tab>("posts");

  return (
    <div className="mt-8">
      <div className="glass mb-4 inline-flex flex-wrap gap-1 rounded-full p-1">
        <TabButton active={tab === "posts"} onClick={() => setTab("posts")}>
          Posts ({posts.length})
        </TabButton>
        <TabButton active={tab === "garage"} onClick={() => setTab("garage")}>
          Garage ({vehicles.length})
        </TabButton>
        <TabButton active={tab === "achievements"} onClick={() => setTab("achievements")}>
          Achievements ({unlockedAtById.size})
        </TabButton>
        {isOwnProfile && (
          <>
            <TabButton active={tab === "saved"} onClick={() => setTab("saved")}>
              Saved ({savedPosts?.length ?? 0})
            </TabButton>
            <TabButton active={tab === "liked"} onClick={() => setTab("liked")}>
              Liked ({likedPosts?.length ?? 0})
            </TabButton>
          </>
        )}
      </div>

      {tab === "posts" &&
        (posts.length === 0 ? (
          <p className="text-sm text-muted">No posts yet.</p>
        ) : (
          <PostThumbnailGrid posts={posts} />
        ))}

      {tab === "garage" &&
        (vehicles.length === 0 ? (
          <p className="text-sm text-muted">No vehicles yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map(({ vehicle, heroUrl, ratingScore }) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                heroUrl={heroUrl}
                ratingScore={ratingScore}
              />
            ))}
          </div>
        ))}

      {tab === "achievements" && <AchievementsGrid unlockedAtById={unlockedAtById} />}

      {tab === "saved" &&
        isOwnProfile &&
        ((savedPosts?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted">Posts you save will show up here.</p>
        ) : (
          <PostThumbnailGrid posts={savedPosts!} />
        ))}

      {tab === "liked" &&
        isOwnProfile &&
        ((likedPosts?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted">Posts you like will show up here.</p>
        ) : (
          <PostThumbnailGrid posts={likedPosts!} />
        ))}
    </div>
  );
}
