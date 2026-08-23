"use client";

import { useState } from "react";
import {
  createBuildPartAction,
  updateBuildPartAction,
} from "@/features/builds/actions";
import { ModificationForm } from "@/features/builds/modification-form";
import { DeleteModificationButton } from "@/features/builds/delete-modification-button";
import { ProductCard } from "@/features/builds/product-card";
import { Button } from "@/components/ui/button";
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
  vehicleId,
  isOwner,
}: {
  part: BuildPart;
  linkedPart: Part | null;
  vehicleId: string;
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

  return (
    <li className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
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
        {linkedPart && (
          <div className="mt-2 max-w-sm">
            <ProductCard part={linkedPart} />
          </div>
        )}
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
  vehicleId,
  isOwner,
}: {
  buildParts: BuildPart[];
  partsById: Map<string, Part>;
  vehicleId: string;
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
              vehicleId={vehicleId}
              isOwner={isOwner}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
