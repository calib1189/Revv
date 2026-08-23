"use client";

import { useState } from "react";
import { AiIdentifyPanel } from "@/features/garage/ai-identify-panel";
import { VehicleForm, type VehicleFormValues } from "@/features/garage/vehicle-form";
import { createVehicleAction } from "@/features/garage/actions";

export function NewVehicleClient() {
  const [initialValues, setInitialValues] = useState<VehicleFormValues>();

  return (
    <>
      <AiIdentifyPanel onUseSuggestion={setInitialValues} />
      <VehicleForm
        action={createVehicleAction}
        initialValues={initialValues}
        submitLabel="Add vehicle"
      />
    </>
  );
}
