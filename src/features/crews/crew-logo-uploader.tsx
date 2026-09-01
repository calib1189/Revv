"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { Button } from "@/components/ui/button";

/** Direct copy of cover-photo-uploader.tsx's pattern, targeting
 * crews.logo_media_id instead of vehicles.hero_media_id. */
export function CrewLogoUploader({
  crewId,
  userId,
  hasLogo,
}: {
  crewId: string;
  userId: string;
  hasLogo: boolean;
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
        .from("crews")
        .update({ logo_media_id: media.id })
        .eq("id", crewId);
      if (updateError) throw updateError;

      router.refresh();
    } catch {
      setError("Couldn't upload that logo. Try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
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
        variant={hasLogo ? "secondary" : "primary"}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className={hasLogo ? "px-3 py-1.5 text-sm" : ""}
      >
        {isUploading ? "Uploading…" : hasLogo ? "Change logo" : "Add logo"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
