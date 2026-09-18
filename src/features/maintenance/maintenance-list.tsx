"use client";

import { useState } from "react";
import {
  createMaintenanceAction,
  updateMaintenanceAction,
} from "@/features/maintenance/actions";
import { MaintenanceForm } from "@/features/maintenance/maintenance-form";
import { DeleteMaintenanceButton } from "@/features/maintenance/delete-maintenance-button";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/grouped-list";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusIcon, WrenchIcon } from "@/components/ui/icons";
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
      <li className="relative p-4">
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
    <li className="relative flex items-start gap-3.5 p-4">
      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-foreground/[0.07] text-muted">
        <WrenchIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-semibold">{record.kind}</p>
        <p className="mt-0.5 text-[0.8125rem] text-muted">
          {formatDateOnly(record.performed_at)}
          {record.mileage != null && ` · ${record.mileage.toLocaleString()} mi`}
        </p>
        {record.notes && (
          <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted">{record.notes}</p>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {record.cost_cents != null && (
          <span className="numeral text-[0.9375rem]">{formatCents(record.cost_cents)}</span>
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
      <SectionTitle
        action={
          isOwner && !isAdding ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              aria-label="Add service record"
              className="pressable flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          ) : undefined
        }
      >
        Service history
      </SectionTitle>

      {isAdding && (
        <div className="glass-raised elev-1 mb-4 rounded-[22px] p-4">
          <MaintenanceForm
            action={createMaintenanceAction.bind(null, vehicleId)}
            submitLabel="Add"
            onSuccess={() => setIsAdding(false)}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {records.length === 0 ? (
        <EmptyState
          card
          title="No service records"
          body="Oil changes, tires, repairs. Keep the car's history in one place."
          action={
            isOwner && !isAdding ? (
              <Button className="px-5" onClick={() => setIsAdding(true)}>
                Add record
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>li+li]:before:absolute [&>li+li]:before:left-[4.25rem] [&>li+li]:before:right-0 [&>li+li]:before:top-0 [&>li+li]:before:h-px [&>li+li]:before:bg-border [&>li+li]:before:content-['']">
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
