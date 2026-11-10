"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadErrorMessage } from "@/lib/storage/upload";
import { createMedia, publicMediaUrl } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { removeDailyEntryAction, submitDailyEntryAction } from "@/features/daily/actions";
import { Sheet } from "@/components/ui/sheet";
import type { DailyEntry, GarageCar, GaragePhoto } from "@/lib/daily/compose";
import { MAX_CAPTION } from "@/lib/daily/validation";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CameraIcon, CheckIcon } from "@/components/ui/icons";

type Source = "garage" | "upload";

/** "Your entry": the button to enter today's challenge, or your entry
 * with its vote count and Edit / Remove while the challenge is open. */
export function MyEntry({
  userId,
  isOpen,
  entry,
  entryVotes,
  garage,
  loginHref,
  challengeTitle,
}: {
  userId: string | null;
  isOpen: boolean;
  entry: DailyEntry | null;
  entryVotes: number;
  garage: { cars: GarageCar[]; photos: GaragePhoto[] };
  loginHref: string;
  challengeTitle: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!userId) {
    return (
      <Link
        href={loginHref}
        className="pressable flex h-12 w-full items-center justify-center rounded-full bg-accent text-[0.9375rem] font-semibold text-accent-foreground"
      >
        Log in to enter
      </Link>
    );
  }

  function handleRemove() {
    if (!entry || !window.confirm("Remove your entry? Any votes it has go with it.")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeDailyEntryAction(entry.id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <>
      {entry ? (
        <div className="glass-raised elev-1 flex items-center gap-4 rounded-[22px] p-3 pr-4">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[16px] bg-foreground/[0.06]">
            {entry.photoUrl && <Image src={entry.photoUrl} alt="" fill sizes="160px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="micro-label text-accent">Your entry</p>
            <p className="mt-1 truncate text-[0.9375rem] font-semibold">{entry.vehicleTitle ?? "Your car"}</p>
            <p className="mt-0.5 text-[0.8125rem] text-muted">
              {entryVotes === 1 ? "1 vote so far" : `${entryVotes} votes so far`}
            </p>
            {isOpen && (
              <div className="mt-2 flex gap-4 text-[0.8125rem] font-semibold">
                <button type="button" onClick={() => setSheetOpen(true)} className="text-accent">
                  Edit
                </button>
                <button type="button" onClick={handleRemove} disabled={isPending} className="text-muted">
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      ) : isOpen ? (
        <Button type="button" onClick={() => setSheetOpen(true)} className="h-12 w-full text-[0.9375rem] font-semibold">
          Enter your ride
        </Button>
      ) : null}
      {error && <p className="mt-2 text-[0.8125rem] text-danger">{error}</p>}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={entry ? "Edit your entry" : challengeTitle}>
        <EnterForm
          userId={userId}
          garage={garage}
          entry={entry}
          onDone={() => {
            setSheetOpen(false);
            router.refresh();
          }}
        />
      </Sheet>
    </>
  );
}

function EnterForm({
  userId,
  garage,
  entry,
  onDone,
}: {
  userId: string;
  garage: { cars: GarageCar[]; photos: GaragePhoto[] };
  entry: DailyEntry | null;
  onDone: () => void;
}) {
  const [source, setSource] = useState<Source>(garage.photos.length > 0 ? "garage" : "upload");
  const [selected, setSelected] = useState<{ mediaId: string; url: string } | null>(() => {
    if (!entry?.photoUrl) return null;
    const fromGarage = garage.photos.find((p) => p.mediaId === entry.mediaId);
    return fromGarage ? { mediaId: fromGarage.mediaId, url: fromGarage.url } : null;
  });
  const [uploaded, setUploaded] = useState<{ mediaId: string; url: string } | null>(null);
  const [vehicleId, setVehicleId] = useState(entry?.vehicleId ?? garage.cars[0]?.id ?? "");
  const [caption, setCaption] = useState(entry?.caption ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const photo = source === "garage" ? selected : uploaded;

  async function handleFile(rawFile: File) {
    const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
    const fileError = validateImageFile(file);
    if (fileError) return setError(fileError);
    setError(null);
    setIsUploading(true);
    try {
      const supabase = createClient();
      const result = await uploadImage(supabase, userId, file, { moderate: true });
      const media = await createMedia(supabase, {
        owner_id: userId,
        storage_path: result.storagePath,
        kind: "image",
        width: result.width,
        height: result.height,
      });
      setUploaded({ mediaId: media.id, url: publicMediaUrl(supabase, result.storagePath) });
    } catch (err) {
      setError(uploadErrorMessage(err, "Couldn't upload that photo. Try again."));
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit() {
    // Editing can keep the photo already entered.
    if (!photo && !entry) return setError("Pick a photo of your car.");
    setError(null);
    startTransition(async () => {
      const result = await submitDailyEntryAction({
        mediaId: photo?.mediaId ?? entry?.mediaId ?? "",
        vehicleId: vehicleId || null,
        caption,
      });
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <SegmentedControl
        value={source}
        onChange={setSource}
        options={[
          { value: "garage", label: "From your garage" },
          { value: "upload", label: "New photo" },
        ]}
      />

      {source === "garage" ? (
        garage.photos.length === 0 ? (
          <p className="rounded-[16px] bg-foreground/[0.05] px-4 py-5 text-center text-[0.875rem] text-muted">
            No photos in your garage yet. Upload a new one instead.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {garage.photos.map((p) => {
              const isSelected = selected?.mediaId === p.mediaId;
              return (
                <button
                  key={p.mediaId}
                  type="button"
                  onClick={() => {
                    setSelected({ mediaId: p.mediaId, url: p.url });
                    setVehicleId(p.vehicleId);
                  }}
                  aria-pressed={isSelected}
                  aria-label={`Photo of ${p.vehicleTitle}`}
                  className={`relative aspect-square overflow-hidden rounded-[12px] bg-foreground/[0.06] ${
                    isSelected ? "ring-[3px] ring-accent" : ""
                  }`}
                >
                  <Image src={p.url} alt="" fill sizes="160px" className="object-cover" />
                  {isSelected && (
                    <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )
      ) : (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-border bg-foreground/[0.04]"
          >
            {uploaded ? (
              <Image src={uploaded.url} alt="" fill sizes="480px" className="object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-[0.875rem] text-muted">
                <CameraIcon className="h-7 w-7" />
                {isUploading ? "Uploading…" : "Choose a photo"}
              </span>
            )}
          </button>
        </div>
      )}

      {garage.cars.length > 0 && (
        <div>
          <Label htmlFor="daily-car">Which car?</Label>
          <select
            id="daily-car"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="glass-inset w-full rounded-[14px] px-4 py-3 text-foreground transition-[box-shadow,border-color] focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15"
          >
            {garage.cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
            <option value="">Don&apos;t link a car</option>
          </select>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="daily-caption">Caption</Label>
          <span className="numeral px-1 text-[0.75rem] text-muted">
            {caption.length}/{MAX_CAPTION}
          </span>
        </div>
        <Input
          id="daily-caption"
          value={caption}
          maxLength={MAX_CAPTION}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Say something about it (optional)"
        />
      </div>

      {error && <p className="text-[0.8125rem] text-danger">{error}</p>}

      <Button
        type="button"
        disabled={isPending || isUploading || (!photo && !entry)}
        onClick={handleSubmit}
        className="h-12 w-full text-[0.9375rem] font-semibold"
      >
        {isPending ? "Saving…" : entry ? "Save entry" : "Submit entry"}
      </Button>
    </div>
  );
}
