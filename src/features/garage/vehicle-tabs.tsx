"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SectionTitle } from "@/components/ui/grouped-list";
import { EmptyState } from "@/components/ui/empty-state";
import { BudgetCard } from "@/features/builds/budget-card";
import { ModificationList } from "@/features/builds/modification-list";
import { GalleryUploader } from "@/features/garage/gallery-uploader";
import { GalleryGrid, type GalleryPhoto } from "@/features/garage/gallery-grid";
import { PostThumbnailGrid, type PostThumbnail } from "@/features/profile/post-thumbnail-grid";
import { MaintenanceList } from "@/features/maintenance/maintenance-list";
import type { BuildPart } from "@/lib/db/build-parts";
import type { Part } from "@/lib/db/parts";
import type { BudgetSummary } from "@/lib/builds/budget";
import type { MaintenanceRecord } from "@/lib/db/maintenance";

type Tab = "mods" | "photos" | "posts" | "history";

/** Same shape as CrewTabs/ProfileTabs: local tab state, every tab's data
 * pre-fetched server-side by the vehicle page and passed down as props —
 * no per-tab refetch. Replaces what used to be one long forced scroll
 * (Budget, then Mods, then Photos, then Maintenance stacked one after
 * another) with switchable sections, and adds a Posts tab that didn't
 * exist before — posts tagged to this vehicle (posts.vehicle_id) were
 * never actually surfaced anywhere on the vehicle's own page. */
export function VehicleTabs({
  vehicleId,
  vehicleLabel,
  userId,
  isOwner,
  budgetSummary,
  buildParts,
  partsById,
  partMediaUrlById,
  clickCountsByBuildPart,
  photos,
  posts,
  maintenanceRecords,
}: {
  vehicleId: string;
  vehicleLabel: string;
  userId: string | null;
  isOwner: boolean;
  budgetSummary: BudgetSummary;
  buildParts: BuildPart[];
  partsById: Map<string, Part>;
  partMediaUrlById: Map<string, string>;
  clickCountsByBuildPart: Map<string, number>;
  photos: GalleryPhoto[];
  posts: PostThumbnail[];
  maintenanceRecords: MaintenanceRecord[];
}) {
  const [tab, setTab] = useState<Tab>("mods");

  const options: { value: Tab; label: string }[] = [
    { value: "mods", label: "Mods" },
    { value: "photos", label: "Photos" },
    { value: "posts", label: "Posts" },
    ...(isOwner ? [{ value: "history" as const, label: "Service" }] : []),
  ];

  return (
    <div className="mt-10">
      <SegmentedControl options={options} value={tab} onChange={setTab} className="mb-6" />

      <div key={tab} className="animate-tab-content-in">
      {tab === "mods" && (
        <div className="flex flex-col gap-10">
          <BudgetCard summary={budgetSummary} vehicleId={vehicleId} isOwner={isOwner} />
          <ModificationList
            buildParts={buildParts}
            partsById={partsById}
            partMediaUrlById={partMediaUrlById}
            vehicleId={vehicleId}
            vehicleLabel={vehicleLabel}
            userId={userId}
            isOwner={isOwner}
            clickCountsByBuildPart={clickCountsByBuildPart}
          />
        </div>
      )}

      {tab === "photos" && (
        <div>
          <SectionTitle
            action={
              isOwner && userId ? (
                <GalleryUploader vehicleId={vehicleId} userId={userId} nextPosition={photos.length} />
              ) : undefined
            }
          >
            Photos
          </SectionTitle>
          {photos.length === 0 ? (
            <EmptyState
              title="No photos yet"
              body={isOwner ? "Add shots of the car from every angle." : "The owner hasn't added any photos."}
            />
          ) : (
            <GalleryGrid photos={photos} isOwner={isOwner} />
          )}
        </div>
      )}

      {tab === "posts" &&
        (posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            body="Posts tagged to this car show up here. Tag it when you post from the feed."
          />
        ) : (
          <PostThumbnailGrid posts={posts} />
        ))}

      {tab === "history" && isOwner && (
        <MaintenanceList records={maintenanceRecords} vehicleId={vehicleId} isOwner={isOwner} />
      )}
      </div>
    </div>
  );
}
