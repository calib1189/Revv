"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import type { MaintenanceRecord } from "@/lib/db/maintenance";
import type { MaintenanceFormState } from "@/features/maintenance/actions";

const initialState: MaintenanceFormState = { error: null };

function centsToDollarsInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toString();
}

export function MaintenanceForm({
  action,
  record,
  submitLabel,
  onSuccess,
  onCancel,
}: {
  action: (
    prevState: MaintenanceFormState,
    formData: FormData,
  ) => Promise<MaintenanceFormState>;
  record?: MaintenanceRecord;
  submitLabel: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      onSuccess?.();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state.error]);

  return (
    <form
      action={formAction}
      className="glass flex flex-col gap-4 rounded-2xl p-4"
    >
      {state.error && <Callout tone="danger">{state.error}</Callout>}

      <div>
        <Label htmlFor="kind">Service</Label>
        <Input
          id="kind"
          name="kind"
          placeholder="Oil change"
          defaultValue={record?.kind ?? ""}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="performedAt">Date</Label>
          <Input
            id="performedAt"
            name="performedAt"
            type="date"
            defaultValue={record?.performed_at ?? ""}
            required
          />
        </div>
        <div>
          <Label htmlFor="mileage">Mileage</Label>
          <Input
            id="mileage"
            name="mileage"
            inputMode="numeric"
            defaultValue={record?.mileage ?? ""}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="cost">Cost ($)</Label>
          <Input
            id="cost"
            name="cost"
            inputMode="decimal"
            defaultValue={centsToDollarsInput(record?.cost_cents ?? null)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={record?.notes ?? ""}
          className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent/60 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
