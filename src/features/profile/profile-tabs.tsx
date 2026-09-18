"use client";

import { useState } from "react";
import { PostThumbnailGrid, type PostThumbnail } from "@/features/profile/post-thumbnail-grid";
import { VehicleBay } from "@/features/garage/vehicle-bay";
import { AchievementsGrid } from "@/features/achievements/achievements-grid";
import { AchievementShowcaseEditor } from "@/features/achievements/achievement-showcase-editor";
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

/** An iOS segmented control: equal-width segments on a tinted track,
 * with a lifted thumb that slides to the active one. Equal widths mean
 * the thumb's position is pure arithmetic (index × segment width) — no
 * measuring, no layout effect, no flash before first measure. */
function SegmentedControl({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.key === active),
  );

  return (
    <div
      role="tablist"
      className="relative flex rounded-[12px] p-[3px]"
      style={{ background: "var(--segment-track)" }}
    >
      <div
        aria-hidden
        className="absolute bottom-[3px] top-[3px] rounded-[9px] shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] transition-transform duration-300 ease-[var(--ease-ios)]"
        style={{
          left: 3,
          width: `calc((100% - 6px) / ${tabs.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
          background: "var(--segment-thumb)",
        }}
      />
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={`relative z-10 min-w-0 flex-1 truncate px-1 py-[7px] text-[0.8125rem] transition-[color,font-weight] duration-200 ${
              isActive ? "font-semibold text-foreground" : "font-medium text-foreground/70"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function EmptyTab({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <p className="text-[1.0625rem] font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-[0.875rem] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

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
      <SegmentedControl tabs={tabs} active={tab} onChange={setTab} />

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
