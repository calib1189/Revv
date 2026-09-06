"use client";

import { useEffect, useRef, useState, type SVGProps } from "react";
import { PostThumbnailGrid, type PostThumbnail } from "@/features/profile/post-thumbnail-grid";
import { VehicleBay } from "@/features/garage/vehicle-bay";
import { AchievementsGrid } from "@/features/achievements/achievements-grid";
import { AchievementShowcaseEditor } from "@/features/achievements/achievement-showcase-editor";
import { GridIcon, WheelIcon, StarIcon, BookmarkIcon, HeartIcon } from "@/components/ui/icons";
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
  count: number;
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
}

/** A sliding highlight (measured off the active button's own rect, not a
 * fixed-width guess) replaces what used to be a flex-wrap pill row —
 * five tabs wrapping to a second, shorter line read as broken, not
 * premium. Horizontal scroll is the fallback for a viewport too narrow
 * to fit all five at once, same as every other tab strip in the app,
 * but the animated highlight is what actually makes this one feel
 * considered rather than another static pill toggle. */
function TabStrip({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const [highlight, setHighlight] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      const button = buttonRefs.current[active];
      const container = containerRef.current;
      if (!button || !container) return;
      setHighlight({ left: button.offsetLeft, width: button.offsetWidth });
    };
    measure();
    // Tab labels don't reflow with the window, but the container's own
    // scroll width can still change once real counts stream in after
    // mount — cheap enough to just remeasure on resize too.
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, tabs]);

  return (
    <div className="glass rounded-2xl p-1.5">
      <div ref={containerRef} className="no-scrollbar relative flex gap-1 overflow-x-auto">
        {highlight && (
          <div
            className="absolute bottom-1 top-1 rounded-xl bg-accent/15 ring-1 ring-inset ring-accent/40 transition-[left,width] duration-300 ease-[var(--ease-ios)]"
            style={{ left: highlight.left, width: highlight.width }}
          />
        )}
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                buttonRefs.current[t.key] = el;
              }}
              type="button"
              onClick={() => onChange(t.key)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                isActive ? "text-foreground" : "text-muted hover:text-foreground/80"
              }`}
            >
              <t.icon className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${isActive ? "text-accent" : ""}`} />
              {t.label}
              <span className={`tabular-nums ${isActive ? "text-accent" : "text-muted/70"}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
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
    { key: "posts", label: "Posts", count: posts.length, icon: GridIcon },
    { key: "garage", label: "Garage", count: vehicles.length, icon: WheelIcon },
    { key: "achievements", label: "Achievements", count: unlockedAtById.size, icon: StarIcon },
    ...(isOwnProfile
      ? ([
          { key: "saved", label: "Saved", count: savedPosts?.length ?? 0, icon: BookmarkIcon },
          { key: "liked", label: "Liked", count: likedPosts?.length ?? 0, icon: HeartIcon },
        ] as TabDef[])
      : []),
  ];

  return (
    <div className="mt-8">
      <TabStrip tabs={tabs} active={tab} onChange={setTab} />

      {/* Remounted per tab (key={tab}) purely for the fade-in — a tab
          switch should feel like new content settling in, not an
          instant, jarring swap. */}
      <div key={tab} className="mt-5 animate-tab-content-in">
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
    </div>
  );
}
