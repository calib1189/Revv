"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { addVehicleMedia } from "@/lib/db/vehicle-media";
import { validateImageFile } from "@/lib/validation/media";
import { Button } from "@/components/ui/button";

export function GalleryUploader({
  vehicleId,
  userId,
  nextPosition,
}: {
  vehicleId: string;
  userId: string;
  nextPosition: number;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFiles(files: FileList) {
    setError(null);
    setIsUploading(true);
    try {
      const supabase = createClient();
      let position = nextPosition;

      for (const file of Array.from(files)) {
        const validationError = validateImageFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }
        const uploaded = await uploadImage(supabase, userId, file);
        const media = await createMedia(supabase, {
          owner_id: userId,
          storage_path: uploaded.storagePath,
          kind: "image",
          width: uploaded.width,
          height: uploaded.height,
        });
        await addVehicleMedia(supabase, vehicleId, media.id, position);
        position += 1;
      }

      router.refresh();
    } catch {
      setError("Couldn't upload one of those photos. Try again.");
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
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="px-3 py-1.5 text-sm"
      >
        {isUploading ? "Uploading…" : "Add photos"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
