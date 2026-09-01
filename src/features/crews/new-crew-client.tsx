"use client";

import { CrewForm } from "@/features/crews/crew-form";
import { createCrewAction } from "@/features/crews/actions";

export function NewCrewClient() {
  return <CrewForm action={createCrewAction} submitLabel="Create crew" />;
}
