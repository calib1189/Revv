"use client";

import { useState } from "react";
import { PostThumbnailGrid, type PostThumbnail } from "@/features/profile/post-thumbnail-grid";
import { VehicleCard } from "@/features/garage/vehicle-card";
import type { Vehicle } from "@/lib/db/vehicles";

export interface ProfileVehicleItem {
  vehicle: Vehicle;
  heroUrl: string | null;
  ratingScore: number | null;
}

export function ProfileTabs({
  username,
  posts,
  vehicles,
}: {
  username: string;
  posts: PostThumbnail[];
  vehicles: ProfileVehicleItem[];
}) {
  const [tab, setTab] = useState<"posts" | "garage">("posts");

  return (
    <div className="mt-8">
      <div className="glass mb-4 inline-flex rounded-full p-1">
        <button
          type="button"
          onClick={() => setTab("posts")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "posts"
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          Posts ({posts.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("garage")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "garage"
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          Garage ({vehicles.length})
        </button>
      </div>

      {tab === "posts" ? (
        posts.length === 0 ? (
          <p className="text-sm text-muted">No posts yet.</p>
        ) : (
          <PostThumbnailGrid posts={posts} username={username} />
        )
      ) : vehicles.length === 0 ? (
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
      )}
    </div>
  );
}
