"use client";

import { useState } from "react";
import { WheelIcon, CameraIcon, GridIcon, WrenchIcon } from "@/components/ui/icons";
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

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
        active ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

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

  return (
    <div className="mt-10">
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-0.5">
        <TabButton active={tab === "mods"} onClick={() => setTab("mods")} icon={<WheelIcon className="h-4 w-4" />}>
          Mods · {buildParts.length}
        </TabButton>
        <TabButton
          active={tab === "photos"}
          onClick={() => setTab("photos")}
          icon={<CameraIcon className="h-4 w-4" />}
        >
          Photos · {photos.length}
        </TabButton>
        <TabButton active={tab === "posts"} onClick={() => setTab("posts")} icon={<GridIcon className="h-4 w-4" />}>
          Posts · {posts.length}
        </TabButton>
        {isOwner && (
          <TabButton
            active={tab === "history"}
            onClick={() => setTab("history")}
            icon={<WrenchIcon className="h-4 w-4" />}
          >
            History · {maintenanceRecords.length}
          </TabButton>
        )}
      </div>

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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Photos</h2>
            {isOwner && userId && (
              <GalleryUploader vehicleId={vehicleId} userId={userId} nextPosition={photos.length} />
            )}
          </div>
          <GalleryGrid photos={photos} isOwner={isOwner} />
          {photos.length === 0 && <p className="text-sm text-muted">No photos in the gallery yet.</p>}
        </div>
      )}

      {tab === "posts" &&
        (posts.length === 0 ? (
          <p className="text-sm text-muted">
            No posts tagged to this build yet — tag it when you post from the feed.
          </p>
        ) : (
          <PostThumbnailGrid posts={posts} />
        ))}

      {tab === "history" && isOwner && (
        <MaintenanceList records={maintenanceRecords} vehicleId={vehicleId} isOwner={isOwner} />
      )}
    </div>
  );
}
