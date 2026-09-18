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
import { SearchIcon, PlusIcon } from "@/components/ui/icons";
import { SectionTitle } from "@/components/ui/grouped-list";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCents } from "@/lib/format/money";
import { formatDateOnly } from "@/lib/format/date";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { PointerIcon } from "@/components/ui/icons";
import type { BuildPart } from "@/lib/db/build-parts";
import type { Part } from "@/lib/db/parts";

const STATUS_LABEL: Record<BuildPart["status"], string> = {
  planned: "Planned",
  ordered: "Ordered",
  installed: "Installed",
};

const STATUS_CLASS: Record<BuildPart["status"], string> = {
  planned: "bg-foreground/10 text-muted",
  ordered: "bg-[#0a84ff]/15 text-[#0a84ff]",
  installed: "bg-success/15 text-success",
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
    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-foreground/[0.06] text-muted">
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
  clickCount,
}: {
  part: BuildPart;
  linkedPart: Part | null;
  photoUrl: string | null;
  vehicleId: string;
  vehicleLabel: string;
  userId: string | null;
  isOwner: boolean;
  /** Total Buy-button clicks on this listing — only ever shown to the
   * owner (see render below), so it's fine to always compute this for
   * every viewer rather than threading isOwner into the query itself. */
  clickCount: number;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="relative p-4">
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
    <li className="relative flex items-start justify-between gap-3 p-4">
      <div className="flex min-w-0 flex-1 gap-3.5">
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
          <p className="text-[0.9375rem] font-semibold leading-snug">{part.raw_name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted">
            <span
              className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${STATUS_CLASS[part.status]}`}
            >
              {STATUS_LABEL[part.status]}
            </span>
            {part.category && <span>{part.category}</span>}
            {part.installed_at && (
              <span>· {formatDateOnly(part.installed_at)}</span>
            )}
          </div>
          {part.notes && (
            <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted">{part.notes}</p>
          )}
          {linkedPart ? (
            <div className="mt-2 max-w-sm">
              <ProductCard part={linkedPart} />
              <div className="mt-2 flex items-center gap-3">
                <BuyButton
                  partId={linkedPart.id}
                  ownerAffiliateUrl={part.owner_affiliate_url}
                  buildPartId={part.id}
                />
                {isOwner && clickCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <PointerIcon className="h-3.5 w-3.5" />
                    {formatCompactNumber(clickCount)}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <a
              href={buildPartSearchUrl(searchQuery)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-2 inline-flex items-center gap-1 text-[0.8125rem] font-medium text-accent"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              Search for this part
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {part.price_cents != null && (
          <span className="numeral text-[0.9375rem]">
            {formatCents(part.price_cents)}
          </span>
        )}
        {isOwner && (
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-[0.8125rem] font-medium text-accent"
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
  clickCountsByBuildPart,
}: {
  buildParts: BuildPart[];
  partsById: Map<string, Part>;
  partMediaUrlById: Map<string, string>;
  vehicleId: string;
  vehicleLabel: string;
  userId: string | null;
  isOwner: boolean;
  clickCountsByBuildPart: Map<string, number>;
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div>
      <SectionTitle
        action={
          <span className="flex items-center gap-3">
            <span className="numeral">{buildParts.length}</span>
            {isOwner && !isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                aria-label="Add modification"
                className="pressable flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            )}
          </span>
        }
      >
        Modifications
      </SectionTitle>

      {isAdding && (
        <div className="glass-raised elev-1 mb-4 rounded-[22px] p-4">
          <ModificationForm
            action={createBuildPartAction.bind(null, vehicleId)}
            submitLabel="Add"
            onSuccess={() => setIsAdding(false)}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {buildParts.length === 0 ? (
        <EmptyState
          card
          title="No mods yet"
          body={
            isOwner
              ? "Log every part on the car. Mods feed your build score and budget."
              : "The owner hasn't logged any mods yet."
          }
          action={
            isOwner && !isAdding ? (
              <Button className="px-5" onClick={() => setIsAdding(true)}>
                Add modification
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>li+li]:before:absolute [&>li+li]:before:left-[5.375rem] [&>li+li]:before:right-0 [&>li+li]:before:top-0 [&>li+li]:before:h-px [&>li+li]:before:bg-border [&>li+li]:before:content-['']">
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
              clickCount={clickCountsByBuildPart.get(part.id) ?? 0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
