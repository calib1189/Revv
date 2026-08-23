"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createMeetupAction, type CreateMeetupState } from "@/features/meetups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";

const initialState: CreateMeetupState = { error: null, success: false };

export function CreateMeetupForm({ onCreated }: { onCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createMeetupAction, initialState);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "denied">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error && state.success) {
      setIsOpen(false);
      formRef.current?.reset();
      setCoords(null);
      onCreated();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state.error, state.success]);

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("idle");
      },
      () => setLocationStatus("denied"),
      { timeout: 8000 },
    );
  }

  if (!isOpen) {
    return (
      <Button type="button" className="px-3 py-1.5 text-sm" onClick={() => setIsOpen(true)}>
        Add meetup
      </Button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="glass flex flex-col gap-4 rounded-2xl p-4">
      {state.error && <Callout tone="danger">{state.error}</Callout>}

      <div>
        <Label htmlFor="meetup-title">Title</Label>
        <Input id="meetup-title" name="title" placeholder="Cars & Coffee" required maxLength={120} />
      </div>

      <div>
        <Label htmlFor="meetup-location">Location</Label>
        <Input
          id="meetup-location"
          name="locationName"
          placeholder="Main St parking lot"
          required
          maxLength={200}
        />
      </div>

      <div>
        <Label htmlFor="meetup-starts-at">Date & time</Label>
        <Input id="meetup-starts-at" name="startsAt" type="datetime-local" required />
      </div>

      <div>
        <Label htmlFor="meetup-description">Description (optional)</Label>
        <textarea
          id="meetup-description"
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="Anything people should know before showing up"
          className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent/60 focus:outline-none"
        />
      </div>

      <div>
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5 text-sm"
          onClick={handleUseLocation}
          disabled={locationStatus === "loading"}
        >
          {coords
            ? "Location added"
            : locationStatus === "loading"
              ? "Getting location…"
              : "Use my current location"}
        </Button>
        <p className="mt-1.5 text-xs text-muted">
          {coords
            ? "People nearby will see a distance on this meetup."
            : locationStatus === "denied"
              ? "Couldn't get your location — the meetup will still post, just without a distance for others."
              : "Optional — lets nearby people see how far away this is."}
        </p>
        <input type="hidden" name="lat" value={coords?.lat ?? ""} />
        <input type="hidden" name="lng" value={coords?.lng ?? ""} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending} className="px-4 py-2.5 text-sm">
          {isPending ? "Posting…" : "Post meetup"}
        </Button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-1 py-2.5 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
