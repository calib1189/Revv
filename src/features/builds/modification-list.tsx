"use client";

import { useState } from "react";
import {
  createBuildPartAction,
  updateBuildPartAction,
} from "@/features/builds/actions";
import { ModificationForm } from "@/features/builds/modification-form";
import { DeleteModificationButton } from "@/features/builds/delete-modification-button";
import { ModificationPhotoUploader } from "@/features/builds/modification-photo-uploader";
import { getCategoryIcon } from "@/features/builds/category-icon";
import { ProductCard } from "@/features/builds/product-card";
import { BuyButton } from "@/features/parts/buy-button";
import { buildPartSearchUrl } from "@/lib/affiliate/amazon-search-link";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "@/components/ui/icons";
import { formatCents } from "@/lib/format/money";
import { formatDateOnly } from "@/lib/format/date";
import type { BuildPart } from "@/lib/db/build-parts";
import type { Part } from "@/lib/db/parts";

const STATUS_LABEL: Record<BuildPart["status"], string> = {
  planned: "Planned",
  ordered: "Ordered",
  installed: "Installed",
};

const STATUS_CLASS: Record<BuildPart["status"], string> = {
  planned: "text-muted",
  ordered: "text-foreground",
  installed: "text-accent",
};

/** Read-only equivalent of ModificationPhotoUploader for a viewer who
 * isn't the owner — same automatic-icon-until-there's-a-real-photo
 * behavior, just without the upload control. */
function ModificationIcon({
  photoUrl,
  category,
  rawName,
}: {
  photoUrl: string | null;
  category: string | null;
  rawName: string;
}) {
  return (
    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-raised text-muted">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- decorative thumbnail in a list; not worth a sized-ancestor Image setup here
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        // Invoked as a plain function rather than <CategoryIcon /> — it's
        // always one of a fixed, stable set of icons under the hood, but
        // resolving *which* one happens at render time, which the
        // react-hooks/static-components rule (rightly, in the general
        // case) won't allow as a JSX tag.
        getCategoryIcon(category, rawName)({ className: "h-6 w-6" })
      )}
    </div>
  );
}

function ModificationRow({
  part,
  linkedPart,
  photoUrl,
  vehicleId,
  vehicleLabel,
  userId,
  isOwner,
}: {
  part: BuildPart;
  linkedPart: Part | null;
  photoUrl: string | null;
  vehicleId: string;
  vehicleLabel: string;
  userId: string | null;
  isOwner: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="border-b border-border py-4 last:border-b-0">
        <ModificationForm
          action={updateBuildPartAction.bind(null, part.id, vehicleId)}
          buildPart={part}
          initialPart={linkedPart}
          submitLabel="Save"
          onSuccess={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    );
  }

  // Wheels are sold by their own size/bolt-pattern spec, not "for a
  // specific car" the way an exhaust or intake is — adding the vehicle
  // to a wheel search narrows toward OEM-fitment results and away from
  // the aftermarket wheel the mod probably actually is. Everything else
  // benefits from the vehicle in the query so the search actually lands
  // on the version that fits this car, not a generic/wrong-application
  // listing.
  const isWheelCategory = part.category?.toLowerCase().includes("wheel") ?? false;
  const searchQuery = [part.category, part.raw_name, !isWheelCategory && vehicleLabel]
    .filter(Boolean)
    .join(" ");

  return (
    <li className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="flex min-w-0 flex-1 gap-3">
        {isOwner && userId ? (
          <ModificationPhotoUploader
            buildPartId={part.id}
            userId={userId}
            photoUrl={photoUrl}
            category={part.category}
            rawName={part.raw_name}
          />
        ) : (
          <ModificationIcon photoUrl={photoUrl} category={part.category} rawName={part.raw_name} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{part.raw_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {part.category && <span>{part.category}</span>}
            <span className={STATUS_CLASS[part.status]}>
              {STATUS_LABEL[part.status]}
            </span>
            {part.installed_at && (
              <span>{formatDateOnly(part.installed_at)}</span>
            )}
          </div>
          {part.notes && (
            <p className="mt-1 text-xs text-muted">{part.notes}</p>
          )}
          {linkedPart ? (
            <div className="mt-2 max-w-sm">
              <ProductCard part={linkedPart} />
              <div className="mt-2">
                <BuyButton partId={linkedPart.id} ownerAffiliateUrl={part.owner_affiliate_url} />
              </div>
            </div>
          ) : (
            <a
              href={buildPartSearchUrl(searchQuery)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              Search for this part
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {part.price_cents != null && (
          <span className="text-sm font-medium">
            {formatCents(part.price_cents)}
          </span>
        )}
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs text-muted hover:text-foreground"
            >
              Edit
            </button>
            <DeleteModificationButton buildPartId={part.id} vehicleId={vehicleId} />
          </div>
        )}
      </div>
    </li>
  );
}

export function ModificationList({
  buildParts,
  partsById,
  partMediaUrlById,
  vehicleId,
  vehicleLabel,
  userId,
  isOwner,
}: {
  buildParts: BuildPart[];
  partsById: Map<string, Part>;
  partMediaUrlById: Map<string, string>;
  vehicleId: string;
  vehicleLabel: string;
  userId: string | null;
  isOwner: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Modifications</h2>
        {isOwner && !isAdding && (
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-sm"
            onClick={() => setIsAdding(true)}
          >
            Add modification
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-4">
          <ModificationForm
            action={createBuildPartAction.bind(null, vehicleId)}
            submitLabel="Add"
            onSuccess={() => setIsAdding(false)}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {buildParts.length === 0 ? (
        <p className="text-sm text-muted">No modifications listed yet.</p>
      ) : (
        <ul>
          {buildParts.map((part) => (
            <ModificationRow
              key={part.id}
              part={part}
              linkedPart={part.part_id ? (partsById.get(part.part_id) ?? null) : null}
              photoUrl={part.media_id ? (partMediaUrlById.get(part.media_id) ?? null) : null}
              vehicleId={vehicleId}
              vehicleLabel={vehicleLabel}
              userId={userId}
              isOwner={isOwner}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
