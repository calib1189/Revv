"use client";

import { useState } from "react";
import { PartForm } from "@/features/admin/part-form";
import { PartRow } from "@/features/admin/part-row";
import { createPartAction } from "@/features/admin/parts-actions";
import { Button } from "@/components/ui/button";
import type { Part } from "@/lib/db/parts";

export function AdminPartsClient({ parts }: { parts: Part[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{parts.length} part{parts.length === 1 ? "" : "s"} in the catalog</p>
        {!isAdding && (
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-sm"
            onClick={() => setIsAdding(true)}
          >
            Add a part
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-4">
          <PartForm
            action={createPartAction}
            submitLabel="Add part"
            onSuccess={() => setIsAdding(false)}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {parts.length === 0 ? (
        <p className="text-sm text-muted">No parts in the catalog yet.</p>
      ) : (
        <ul>
          {parts.map((part) => (
            <PartRow key={part.id} part={part} />
          ))}
        </ul>
      )}
    </div>
  );
}
