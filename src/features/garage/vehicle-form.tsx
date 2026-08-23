"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import type { Vehicle } from "@/lib/db/vehicles";
import type { VehicleFormState } from "@/features/garage/actions";

const initialState: VehicleFormState = { error: null };

export interface VehicleFormValues {
  year?: number | string | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
}

interface VehicleFormProps {
  action: (
    prevState: VehicleFormState,
    formData: FormData,
  ) => Promise<VehicleFormState>;
  vehicle?: Vehicle;
  initialValues?: VehicleFormValues;
  submitLabel: string;
}

export function VehicleForm({
  action,
  vehicle,
  initialValues,
  submitLabel,
}: VehicleFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );

  const values = { ...vehicle, ...initialValues };

  return (
    <form
      key={JSON.stringify(initialValues ?? {})}
      action={formAction}
      className="flex flex-col gap-6"
    >
      {state.error && <Callout tone="danger">{state.error}</Callout>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            name="year"
            inputMode="numeric"
            defaultValue={values?.year ?? ""}
            required
          />
        </div>
        <div>
          <Label htmlFor="make">Make</Label>
          <Input id="make" name="make" defaultValue={values?.make ?? ""} required />
        </div>
        <div>
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            name="model"
            defaultValue={values?.model ?? ""}
            required
          />
        </div>
        <div>
          <Label htmlFor="trim">Trim</Label>
          <Input id="trim" name="trim" defaultValue={values?.trim ?? ""} />
        </div>
        <div>
          <Label htmlFor="engine">Engine</Label>
          <Input
            id="engine"
            name="engine"
            placeholder="2JZ-GTE"
            defaultValue={vehicle?.engine ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="drivetrain">Drivetrain</Label>
          <Input
            id="drivetrain"
            name="drivetrain"
            placeholder="RWD"
            defaultValue={vehicle?.drivetrain ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="color">Color</Label>
          <Input id="color" name="color" defaultValue={vehicle?.color ?? ""} />
        </div>
        <div>
          <Label htmlFor="mileage">Mileage</Label>
          <Input
            id="mileage"
            name="mileage"
            inputMode="numeric"
            defaultValue={vehicle?.mileage ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="nickname">Nickname</Label>
        <Input
          id="nickname"
          name="nickname"
          placeholder="Optional"
          defaultValue={vehicle?.nickname ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={vehicle?.description ?? ""}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
