"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadErrorMessage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { GroupedButtonRow, RowIcon } from "@/components/ui/grouped-list";
import { CameraIcon, ChevronRightIcon } from "@/components/ui/icons";

export function CoverPhotoUploader({
  vehicleId,
  userId,
  hasPhoto,
}: {
  vehicleId: string;
  userId: string;
  hasPhoto: boolean;
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
      const uploaded = await uploadImage(supabase, userId, file, { moderate: true });
      const media = await createMedia(supabase, {
        owner_id: userId,
        storage_path: uploaded.storagePath,
        kind: "image",
        width: uploaded.width,
        height: uploaded.height,
      });
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ hero_media_id: media.id })
        .eq("id", vehicleId);
      if (updateError) throw updateError;

      router.refresh();
    } catch (err) {
      setError(uploadErrorMessage(err, "Couldn't upload that photo. Try again."));
    } finally {
      setIsUploading(false);
    }
  }

  // Rendered as a row of the vehicle page's owner GroupedList — one
  // wrapper element so the list's hairline logic sees a single row.
  return (
    <div className="relative" style={{ "--row-inset": "3.625rem" } as CSSProperties}>
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
      <GroupedButtonRow
        icon={
          <RowIcon color="#0a84ff">
            <CameraIcon />
          </RowIcon>
        }
        label={isUploading ? "Uploading…" : hasPhoto ? "Change cover photo" : "Add cover photo"}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        trailing={<ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />}
      />
      {error && <p className="px-4 pb-3 text-[0.8125rem] text-danger">{error}</p>}
    </div>
  );
}
