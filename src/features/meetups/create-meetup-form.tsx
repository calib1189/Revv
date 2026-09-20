"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addMeetupMedia } from "@/lib/db/meetup-media";
import { createMedia } from "@/lib/db/media";
import { uploadImage } from "@/lib/storage/upload";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { validateMeetup } from "@/lib/validation/meetup";
import {
  createMeetupDraftAction,
  createMeetupCheckoutAction,
} from "@/features/meetups/actions";
import { NativeCheckoutGate } from "@/features/auth/native-checkout-gate";
import { useIsNative } from "@/lib/native/use-is-native";
import { MEETUP_TIERS, isPaidMeetupTier, type MeetupTier } from "@/lib/db/meetups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { PlusIcon, ChevronRightIcon } from "@/components/ui/icons";
import { TierPicker, type TierMetal } from "@/components/ui/tier-picker";
import type { Crew } from "@/lib/db/crews";

const MAX_PHOTOS = 5;
const TIER_ORDER: MeetupTier[] = ["free", "standard", "promoted", "diamond"];
const TIER_METALS: Record<MeetupTier, TierMetal> = {
  free: "iron",
  standard: "silver",
  promoted: "gold",
  diamond: "diamond",
};
const TIER_SUBTITLES: Record<MeetupTier, string> = {
  free: "Listed by date, like every other meet",
  standard: "Sorts above free listings",
  promoted: "Sorts above Silver listings",
  diamond: "Top-tier placement — sorts above every Gold and Silver meet",
};

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

export function CreateMeetupForm({ userId, crews }: { userId: string; crews: Crew[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "denied"
  >("idle");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [tier, setTier] = useState<MeetupTier>("free");
  const [crewId, setCrewId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const isNative = useIsNative();
  // Paying to promote still has to happen on the website (Apple requires
  // In-App Purchase for anything that buys placement inside the app — see
  // createWebHandoffAction). A free listing is not a purchase, so it runs
  // entirely in the app; only the paid tiers hand off.
  const needsWebHandoff = isNative === true && isPaidMeetupTier(tier);
  const formRef = useRef<HTMLFormElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function resetAndClose() {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setCoords(null);
    setTier("free");
    setCrewId("");
    setError(null);
    setSubmitted(false);
    formRef.current?.reset();
    setIsOpen(false);
  }

  async function handleSelectPhotos(files: FileList) {
    const next: SelectedPhoto[] = [...photos];
    for (const rawFile of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) break;
      const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
      const fileError = validateImageFile(file);
      if (fileError) {
        setError(fileError);
        continue;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("idle");
      },
      () => setLocationStatus("denied"),
      { timeout: 8000 },
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = String(formData.get("title") ?? "");
    const locationName = String(formData.get("locationName") ?? "");
    const startsAt = String(formData.get("startsAt") ?? "");
    const description = String(formData.get("description") ?? "").trim();

    const validationError = validateMeetup({ title, locationName, startsAt });
    if (validationError) return setError(validationError);

    setIsPending(true);
    try {
      const draft = await createMeetupDraftAction({
        title,
        description,
        locationName,
        startsAt,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        tier,
        crewId: crewId || null,
      });
      if (draft.error || !draft.meetupId) {
        setError(draft.error ?? "Couldn't create that meetup. Try again.");
        return;
      }
      const meetupId = draft.meetupId;

      const supabase = createClient();
      let position = 0;
      for (const photo of photos) {
        const uploaded = await uploadImage(supabase, userId, photo.file);
        const media = await createMedia(supabase, {
          owner_id: userId,
          storage_path: uploaded.storagePath,
          kind: "image",
          width: uploaded.width,
          height: uploaded.height,
        });
        await addMeetupMedia(supabase, meetupId, media.id, position);
        position += 1;
      }

      // A free listing is already sitting in the admin review queue — it
      // has no checkout to start, and sending it to one would be the bug
      // this whole tier exists to remove.
      if (!draft.requiresPayment) {
        setSubmitted(true);
        return;
      }

      const checkout = await createMeetupCheckoutAction({ meetupId });
      if (checkout.error || !checkout.url) {
        setError(checkout.error ?? "Couldn't start checkout. Try again.");
        return;
      }
      window.location.href = checkout.url;
    } catch {
      setError("Couldn't create that meetup. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="glass-raised elev-1 flex flex-col items-center gap-2 rounded-[22px] p-6 text-center">
        <p className="text-[0.9375rem] font-semibold">Sent for review</p>
        <p className="max-w-xs text-[0.8125rem] text-muted">
          An admin checks every meet before it goes live. Yours shows up in
          Discover once it&apos;s approved — you can follow it under My meets.
        </p>
        <button
          type="button"
          onClick={resetAndClose}
          className="mt-1 text-[0.8125rem] font-semibold text-accent"
        >
          Done
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="pressable glass-raised elev-1 flex w-full items-center gap-3.5 rounded-[22px] p-4 text-left"
      >
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <PlusIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-semibold">Host a meet</span>
          <span className="block text-[0.8125rem] text-muted">Post a cars &amp; coffee, cruise, or track day</span>
        </span>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="glass-raised elev-1 flex flex-col gap-4 rounded-[22px] p-5"
    >
        {error && <Callout tone="danger">{error}</Callout>}

        <div>
          <Label htmlFor="meetup-title">Title</Label>
          <Input
            id="meetup-title"
            name="title"
            placeholder="Cars & Coffee"
            required
            maxLength={120}
          />
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
          <Input
            id="meetup-starts-at"
            name="startsAt"
            type="datetime-local"
            required
          />
        </div>

        <div>
          <Label htmlFor="meetup-description">Description (optional)</Label>
          <textarea
            id="meetup-description"
            name="description"
            rows={3}
            maxLength={2000}
            placeholder="Anything people should know before showing up"
            className="glass-inset w-full rounded-[14px] px-4 py-3 text-foreground placeholder:text-muted transition-[box-shadow,border-color] focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15"
          />
        </div>

        <div>
          <Label>Photos (optional)</Label>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleSelectPhotos(e.target.files);
              e.target.value = "";
            }}
          />

          {photos.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset */}
                  <img
                    src={photo.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove photo"
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-sm"
              onClick={() => photoInputRef.current?.click()}
            >
              {photos.length > 0 ? "Add more photos" : "Add photos"}
            </Button>
          )}
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
        </div>

        {crews.length > 0 && (
          <div>
            <Label htmlFor="meetup-crew">Attach to a crew (optional)</Label>
            <select
              id="meetup-crew"
              value={crewId}
              onChange={(e) => setCrewId(e.target.value)}
              className="glass-inset w-full rounded-[14px] px-4 py-3 text-foreground transition-[box-shadow,border-color] focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15"
            >
              <option value="">None</option>
              {crews.map((crew) => (
                <option key={crew.id} value={crew.id}>
                  {crew.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label>Plan</Label>
          <TierPicker
            name="meetup-tier"
            value={tier}
            onChange={(id) => setTier(id as MeetupTier)}
            options={TIER_ORDER.map((t) => ({
              id: t,
              metal: TIER_METALS[t],
              priceCents: MEETUP_TIERS[t].priceCents,
              label: MEETUP_TIERS[t].label,
              priceLabel: t === "free" ? "Free" : undefined,
              subtitle: TIER_SUBTITLES[t],
            }))}
          />
          <p className="mt-1.5 text-xs text-muted">
            Posting is free. Paid tiers sort ahead of free ones, regardless of
            distance.
          </p>
        </div>

        {needsWebHandoff ? (
          <NativeCheckoutGate nextPath="/discover" what="Paying to promote a meet" />
        ) : (
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isPending}
              className="px-4 py-2.5 text-sm"
            >
              {isPending
                ? isPaidMeetupTier(tier)
                  ? "Starting checkout…"
                  : "Posting…"
                : isPaidMeetupTier(tier)
                  ? `Continue to payment · $${(MEETUP_TIERS[tier].priceCents / 100).toFixed(0)}`
                  : "Post meet"}
            </Button>
            <button
              type="button"
              onClick={resetAndClose}
              className="px-1 py-2.5 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
  );
}
