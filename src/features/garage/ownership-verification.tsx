"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";

type VerificationStatus = "none" | "pending" | "approved" | "rejected";

/** Leaderboard eligibility gate — a build only counts for the leaderboard
 * once this is "approved". The photo requirement (whole car, owner's
 * username handwritten on paper in frame) exists specifically so lifting
 * a photo off Google or a forum isn't enough on its own: you need the
 * physical car in front of you to stage the required shot. Reuses the
 * same direct-upload pattern as cover-photo-uploader.tsx; the RLS
 * trigger (0040_ownership_verification.sql) only lets a non-admin move
 * this to "pending", never straight to "approved" — actual approval
 * only happens through the admin review queue. */
export function OwnershipVerification({
  vehicleId,
  userId,
  status,
}: {
  vehicleId: string;
  userId: string;
  status: VerificationStatus;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(rawFile: File) {
    const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const supabase = createClient();
      const uploaded = await uploadImage(supabase, userId, file);
      const media = await createMedia(supabase, {
        owner_id: userId,
        storage_path: uploaded.storagePath,
        kind: "image",
        width: uploaded.width,
        height: uploaded.height,
      });
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({
          ownership_verification_media_id: media.id,
          ownership_verification_status: "pending",
        })
        .eq("id", vehicleId);
      if (updateError) throw updateError;

      router.refresh();
    } catch {
      setError("Couldn't upload that photo. Try again.");
    } finally {
      setIsUploading(false);
    }
  }

  if (status === "approved") {
    return (
      <div className="glass-raised elev-1 flex items-center gap-3 rounded-[22px] px-4 py-3">
        <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-success text-white">
          <CheckIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold">Verified owner</p>
          <p className="text-[0.8125rem] text-muted">This build counts on the leaderboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-raised elev-1 rounded-[22px] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[1.0625rem] font-semibold tracking-[-0.01em]">Get on the leaderboard</p>
        {status === "pending" && (
          <span className="flex-shrink-0 rounded-full bg-foreground/10 px-2.5 py-0.5 text-[0.75rem] font-semibold text-muted">
            In review
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">
        Upload one photo of the whole car with your username written on paper
        somewhere in frame. An admin reviews it before this build can appear
        on the leaderboard.
      </p>
      {status === "rejected" && (
        <p className="mt-2 text-[0.8125rem] text-danger">
          Not approved. Make sure the whole car and a clearly legible username
          are both visible, then try again.
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="mt-4 h-10 w-full text-[0.9375rem] font-semibold"
      >
        {isUploading ? "Uploading…" : status === "none" ? "Upload photo" : "Resubmit photo"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
