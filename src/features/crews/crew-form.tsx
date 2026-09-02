"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { LockIcon, GlobeIcon } from "@/components/ui/icons";
import { CREW_CATEGORIES, CREW_CATEGORY_LABELS, type CrewCategory } from "@/lib/crews/category";
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
  const [category, setCategory] = useState<CrewCategory>(crew?.category ?? CREW_CATEGORIES[0]);
  const [visibility, setVisibility] = useState<"public" | "private">(crew?.visibility ?? "public");

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
        <Label>Category</Label>
        <input type="hidden" name="category" value={category} />
        <div className="flex flex-wrap gap-2">
          {CREW_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                category === c ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
              }`}
            >
              {CREW_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
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
        <Label>Visibility</Label>
        <input type="hidden" name="visibility" value={visibility} />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setVisibility("public")}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 text-center transition-colors ${
              visibility === "public" ? "border-accent bg-accent/10" : "border-border"
            }`}
          >
            <GlobeIcon className={`h-5 w-5 ${visibility === "public" ? "text-accent" : "text-muted"}`} />
            <span className="text-sm font-semibold">Public</span>
            <span className="text-xs text-muted">Anyone can join instantly</span>
          </button>
          <button
            type="button"
            onClick={() => setVisibility("private")}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 text-center transition-colors ${
              visibility === "private" ? "border-accent bg-accent/10" : "border-border"
            }`}
          >
            <LockIcon className={`h-5 w-5 ${visibility === "private" ? "text-accent" : "text-muted"}`} />
            <span className="text-sm font-semibold">Private</span>
            <span className="text-xs text-muted">People must request to join</span>
          </button>
        </div>
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
