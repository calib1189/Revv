"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { validateImageFile } from "@/lib/validation/media";
import { getCategoryIcon } from "@/features/builds/category-icon";

/** One photo per modification — same single-FK pattern as a vehicle's
 * cover photo (CoverPhotoUploader), not a gallery, since a mod only
 * needs one reference shot. Writes straight from the browser client
 * (upload -> media row -> update the build_part's media_id), same as
 * every other owner-photo flow in the garage — build_parts' existing RLS
 * policy already covers this column, no server action needed.
 *
 * Automatic by default: until a real photo is added, this shows a
 * category-matched icon (no upload required, no cost, never claims to
 * be an actual photo of the part) — clicking it still opens the picker
 * so the owner can swap in a real photo of their exact part whenever
 * they want to. */
export function ModificationPhotoUploader({
  buildPartId,
  userId,
  photoUrl,
  category,
  rawName,
}: {
  buildPartId: string;
  userId: string;
  photoUrl: string | null;
  category: string | null;
  rawName: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
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
        .from("build_parts")
        .update({ media_id: media.id })
        .eq("id", buildPartId);
      if (updateError) throw updateError;

      router.refresh();
    } catch {
      setError("Couldn't upload that photo. Try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex-shrink-0">
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
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        aria-label={photoUrl ? "Change photo" : "Add a real photo of this part"}
        className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-surface-raised text-muted disabled:opacity-60"
      >
        {photoUrl ? (
          <Image src={photoUrl} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          // Invoked as a plain function, not <CategoryIcon /> — see the
          // matching comment in modification-list.tsx's ModificationIcon.
          getCategoryIcon(category, rawName)({ className: "h-6 w-6" })
        )}
      </button>
      {error && <p className="mt-1 max-w-[7rem] text-[11px] text-danger">{error}</p>}
    </div>
  );
}
