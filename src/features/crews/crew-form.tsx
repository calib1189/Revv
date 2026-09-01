"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { CREW_CATEGORIES, CREW_CATEGORY_LABELS } from "@/lib/crews/category";
import type { Crew } from "@/lib/db/crews";
import type { CrewFormState } from "@/features/crews/actions";

const initialState: CrewFormState = { error: null };

interface CrewFormProps {
  action: (prevState: CrewFormState, formData: FormData) => Promise<CrewFormState>;
  crew?: Crew;
  submitLabel: string;
}

export function CrewForm({ action, crew, submitLabel }: CrewFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && <Callout tone="danger">{state.error}</Callout>}

      <div>
        <Label htmlFor="name">Crew name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Louisiana Mustang Crew"
          defaultValue={crew?.name ?? ""}
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          defaultValue={crew?.category ?? CREW_CATEGORIES[0]}
          className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent/60 focus:outline-none"
        >
          {CREW_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CREW_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="locationText">Location</Label>
        <Input
          id="locationText"
          name="locationText"
          placeholder="Optional — Hammond, LA"
          defaultValue={crew?.location_text ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="visibility">Visibility</Label>
        <select
          id="visibility"
          name="visibility"
          defaultValue={crew?.visibility ?? "public"}
          className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent/60 focus:outline-none"
        >
          <option value="public">Public — anyone can join instantly</option>
          <option value="private">Private — people must request to join</option>
        </select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="What's this crew about?"
          defaultValue={crew?.description ?? ""}
          className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent/60 focus:outline-none"
        />
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
