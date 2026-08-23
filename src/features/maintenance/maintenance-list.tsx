"use client";

import { useState } from "react";
import {
  createMaintenanceAction,
  updateMaintenanceAction,
} from "@/features/maintenance/actions";
import { MaintenanceForm } from "@/features/maintenance/maintenance-form";
import { DeleteMaintenanceButton } from "@/features/maintenance/delete-maintenance-button";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format/money";
import { formatDateOnly } from "@/lib/format/date";
import type { MaintenanceRecord } from "@/lib/db/maintenance";

function MaintenanceRow({
  record,
  vehicleId,
  isOwner,
}: {
  record: MaintenanceRecord;
  vehicleId: string;
  isOwner: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="border-b border-border py-4 last:border-b-0">
        <MaintenanceForm
          action={updateMaintenanceAction.bind(null, record.id, vehicleId)}
          record={record}
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
        <p className="text-sm font-medium">{record.kind}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>{formatDateOnly(record.performed_at)}</span>
          {record.mileage != null && <span>{record.mileage.toLocaleString()} mi</span>}
        </div>
        {record.notes && (
          <p className="mt-1 text-xs text-muted">{record.notes}</p>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {record.cost_cents != null && (
          <span className="text-sm font-medium">
            {formatCents(record.cost_cents)}
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
            <DeleteMaintenanceButton recordId={record.id} vehicleId={vehicleId} />
          </div>
        )}
      </div>
    </li>
  );
}

export function MaintenanceList({
  records,
  vehicleId,
  isOwner,
}: {
  records: MaintenanceRecord[];
  vehicleId: string;
  isOwner: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Maintenance</h2>
        {isOwner && !isAdding && (
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-sm"
            onClick={() => setIsAdding(true)}
          >
            Add record
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-4">
          <MaintenanceForm
            action={createMaintenanceAction.bind(null, vehicleId)}
            submitLabel="Add"
            onSuccess={() => setIsAdding(false)}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {records.length === 0 ? (
        <p className="text-sm text-muted">No maintenance records yet.</p>
      ) : (
        <ul>
          {records.map((record) => (
            <MaintenanceRow
              key={record.id}
              record={record}
              vehicleId={vehicleId}
              isOwner={isOwner}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
