"use client";

import { useState, useTransition } from "react";
import { PartForm } from "@/features/admin/part-form";
import { updatePartAction, deletePartAction } from "@/features/admin/parts-actions";
import { getPartCategoryLabel } from "@/lib/parts/categories";
import type { Part } from "@/lib/db/parts";

function DeletePartButton({ partId }: { partId: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isConfirming) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="text-danger">Delete?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deletePartAction(partId))}
          className="font-medium text-danger underline underline-offset-2"
        >
          {isPending ? "…" : "Yes"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setIsConfirming(false)}
          className="text-muted underline underline-offset-2"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsConfirming(true)}
      className="text-xs text-muted hover:text-danger"
    >
      Delete
    </button>
  );
}

export function PartRow({ part }: { part: Part }) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="border-b border-border py-4 last:border-b-0">
        <PartForm
          action={updatePartAction.bind(null, part.id)}
          part={part}
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
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            {part.brand} {part.product}
          </p>
          {part.verified ? (
            <span className="flex-shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
              Verified
            </span>
          ) : (
            <span className="flex-shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted">
              Unverified
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {part.category && <span>{getPartCategoryLabel(part.category)}</span>}
          {part.part_number && <span>{part.part_number}</span>}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs text-muted hover:text-foreground"
        >
          Edit
        </button>
        <DeletePartButton partId={part.id} />
      </div>
    </li>
  );
}
