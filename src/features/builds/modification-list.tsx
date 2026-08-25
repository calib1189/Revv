"use client";

import { useState } from "react";
import {
  createBuildPartAction,
  updateBuildPartAction,
} from "@/features/builds/actions";
import { ModificationForm } from "@/features/builds/modification-form";
import { DeleteModificationButton } from "@/features/builds/delete-modification-button";
import { ModificationPhotoUploader } from "@/features/builds/modification-photo-uploader";
import { ProductCard } from "@/features/builds/product-card";
import { BuyButton } from "@/features/parts/buy-button";
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

function ModificationRow({
  part,
  linkedPart,
  photoUrl,
  vehicleId,
  userId,
  isOwner,
}: {
  part: BuildPart;
  linkedPart: Part | null;
  photoUrl: string | null;
  vehicleId: string;
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

  const searchQuery = [part.category, part.raw_name].filter(Boolean).join(" ");

  return (
    <li className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="flex min-w-0 flex-1 gap-3">
        {isOwner && userId ? (
          <ModificationPhotoUploader
            buildPartId={part.id}
            userId={userId}
            photoUrl={photoUrl}
          />
        ) : (
          photoUrl && (
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-surface-raised">
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative thumbnail in a list; not worth a sized-ancestor Image setup here */}
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )
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
                <BuyButton partId={linkedPart.id} />
              </div>
            </div>
          ) : (
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
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
  userId,
  isOwner,
}: {
  buildParts: BuildPart[];
  partsById: Map<string, Part>;
  partMediaUrlById: Map<string, string>;
  vehicleId: string;
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
              userId={userId}
              isOwner={isOwner}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
