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
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckIcon className="h-4 w-4" />
        Verified — eligible for the leaderboard
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-sm font-medium">Verify ownership for the leaderboard</p>
      <p className="mt-1 text-xs text-muted">
        Upload one photo showing the whole car, with your username written on
        paper somewhere in frame. An admin reviews it before this build can
        appear on the leaderboard.
      </p>
      {status === "pending" && (
        <p className="mt-2 text-xs text-muted">Submitted — waiting on review.</p>
      )}
      {status === "rejected" && (
        <p className="mt-2 text-xs text-danger">
          Not approved — make sure the whole car and a clearly legible
          username are both visible, then try again.
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
        className="mt-3 px-3 py-1.5 text-sm"
      >
        {isUploading ? "Uploading…" : status === "none" ? "Upload photo" : "Resubmit photo"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
