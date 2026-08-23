"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import type { BuildPart } from "@/lib/db/build-parts";
import type { BuildPartFormState } from "@/features/builds/actions";

const initialState: BuildPartFormState = { error: null };

function centsToDollarsInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toString();
}

interface ModificationFormProps {
  action: (
    prevState: BuildPartFormState,
    formData: FormData,
  ) => Promise<BuildPartFormState>;
  buildPart?: BuildPart;
  submitLabel: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ModificationForm({
  action,
  buildPart,
  submitLabel,
  onSuccess,
  onCancel,
}: ModificationFormProps) {
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
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4"
    >
      {state.error && <Callout tone="danger">{state.error}</Callout>}

      <div>
        <Label htmlFor="rawName">Name</Label>
        <Input
          id="rawName"
          name="rawName"
          placeholder="Apex EC-7 18x9.5 +35"
          defaultValue={buildPart?.raw_name ?? ""}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            placeholder="Wheels"
            defaultValue={buildPart?.category ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={buildPart?.status ?? "planned"}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="planned">Planned</option>
            <option value="ordered">Ordered</option>
            <option value="installed">Installed</option>
          </select>
        </div>
        <div>
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            defaultValue={centsToDollarsInput(buildPart?.price_cents ?? null)}
          />
        </div>
        <div>
          <Label htmlFor="installCost">Install cost ($)</Label>
          <Input
            id="installCost"
            name="installCost"
            inputMode="decimal"
            defaultValue={centsToDollarsInput(
              buildPart?.install_cost_cents ?? null,
            )}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="installedAt">Install date</Label>
          <Input
            id="installedAt"
            name="installedAt"
            type="date"
            defaultValue={buildPart?.installed_at?.slice(0, 10) ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={buildPart?.notes ?? ""}
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
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
