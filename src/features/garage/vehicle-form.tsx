"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FormGroup, FormField, FormSelect, FormTextarea } from "@/components/ui/form-group";
import type { Vehicle } from "@/lib/db/vehicles";
import type { VehicleFormState } from "@/features/garage/actions";
import {
  VEHICLE_CATEGORIES,
  VEHICLE_CATEGORY_LABELS,
  type VehicleCategory,
} from "@/lib/vehicles/category";
import { guessVehicleCategory } from "@/lib/vehicles/guess-category";

const initialState: VehicleFormState = { error: null };

export interface VehicleFormValues {
  year?: number | string | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  category?: VehicleCategory | null;
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

  const [make, setMake] = useState(values?.make ?? "");
  const [model, setModel] = useState(values?.model ?? "");
  const [category, setCategory] = useState<VehicleCategory>(
    (values?.category as VehicleCategory) ??
      guessVehicleCategory(values?.make ?? "", values?.model ?? "") ??
      "cars",
  );
  // Editing an existing vehicle already has an intentional, previously-
  // confirmed category — typing in make/model there shouldn't silently
  // change it. Adding a new one starts free to guess as you type, until
  // you touch the dropdown yourself, at which point your choice wins for
  // the rest of the session (typing further doesn't fight you over it).
  const categoryTouchedRef = useRef(Boolean(vehicle));

  function handleMakeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setMake(next);
    if (!categoryTouchedRef.current) {
      setCategory(guessVehicleCategory(next, model) ?? "cars");
    }
  }

  function handleModelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setModel(next);
    if (!categoryTouchedRef.current) {
      setCategory(guessVehicleCategory(make, next) ?? "cars");
    }
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    categoryTouchedRef.current = true;
    setCategory(e.target.value as VehicleCategory);
  }

  return (
    <form
      key={JSON.stringify(initialValues ?? {})}
      action={formAction}
      className="flex flex-col gap-7"
    >
      {state.error && <Callout tone="danger">{state.error}</Callout>}

      <FormGroup title="Vehicle">
        <FormField
          label="Year"
          id="year"
          name="year"
          inputMode="numeric"
          placeholder="Required"
          defaultValue={values?.year ?? ""}
          required
        />
        <FormField label="Make" id="make" name="make" placeholder="Required" value={make} onChange={handleMakeChange} required />
        <FormField label="Model" id="model" name="model" placeholder="Required" value={model} onChange={handleModelChange} required />
        <FormField label="Trim" id="trim" name="trim" placeholder="Optional" defaultValue={values?.trim ?? ""} />
        <FormSelect label="Category" id="category" name="category" value={category} onChange={handleCategoryChange}>
          {VEHICLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {VEHICLE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </FormSelect>
      </FormGroup>

      <FormGroup title="Specs">
        <FormField label="Engine" id="engine" name="engine" placeholder="2JZ-GTE" defaultValue={vehicle?.engine ?? ""} />
        <FormField label="Drivetrain" id="drivetrain" name="drivetrain" placeholder="RWD" defaultValue={vehicle?.drivetrain ?? ""} />
        <FormField label="Color" id="color" name="color" placeholder="Optional" defaultValue={vehicle?.color ?? ""} />
        <FormField
          label="Mileage"
          id="mileage"
          name="mileage"
          inputMode="numeric"
          placeholder="Optional"
          defaultValue={vehicle?.mileage ?? ""}
        />
      </FormGroup>

      <FormGroup title="About" footer="A nickname replaces make and model as the car's name everywhere on SORZA.">
        <FormField label="Nickname" id="nickname" name="nickname" placeholder="Optional" defaultValue={vehicle?.nickname ?? ""} />
        <FormTextarea
          id="description"
          name="description"
          rows={4}
          aria-label="Description"
          placeholder="The story of the build"
          defaultValue={vehicle?.description ?? ""}
        />
      </FormGroup>

      <Button type="submit" disabled={isPending} className="h-12 w-full text-[1rem] font-semibold">
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
