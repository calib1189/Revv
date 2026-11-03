"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadErrorMessage, UploadFailedError } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { getCategoryIcon } from "@/features/builds/category-icon";
import { Spinner } from "@/components/ui/spinner";

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
  onError,
}: {
  buildPartId: string;
  userId: string;
  photoUrl: string | null;
  category: string | null;
  rawName: string;
  /** Errors are shown by the row (full width, under the mod's name)
   * rather than squeezed under this 56px thumbnail. */
  onError: (message: string | null) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(rawFile: File) {
    onError(null);
    setIsUploading(true);
    try {
      const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
      const validationError = validateImageFile(file);
      if (validationError) {
        onError(validationError);
        return;
      }

      const supabase = createClient();
      const uploaded = await uploadImage(supabase, userId, file, { moderate: true });

      let mediaId: string;
      try {
        const media = await createMedia(supabase, {
          owner_id: userId,
          storage_path: uploaded.storagePath,
          kind: "image",
          width: uploaded.width,
          height: uploaded.height,
        });
        mediaId = media.id;
      } catch (err) {
        console.error("ModificationPhotoUploader: media row failed:", err);
        throw new UploadFailedError("The photo uploaded but couldn't be saved. Try again.");
      }

      // Read back: RLS filtering the row out isn't an error, it's just
      // zero rows — which used to look exactly like success.
      const { data: updated, error: updateError } = await supabase
        .from("build_parts")
        .update({ media_id: mediaId })
        .eq("id", buildPartId)
        .select("id");
      if (updateError) {
        console.error("ModificationPhotoUploader: attaching to the mod failed:", updateError);
        throw new UploadFailedError("The photo uploaded but couldn't be added to this mod. Try again.");
      }
      if (!updated || updated.length === 0) {
        throw new UploadFailedError("Couldn't add a photo to this mod — it isn't on a build you own.");
      }

      router.refresh();
    } catch (err) {
      onError(uploadErrorMessage(err, "Couldn't upload that photo. Try again."));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex-shrink-0">
      <input
        ref={inputRef}
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
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        aria-label={photoUrl ? "Change photo" : "Add a real photo of this part"}
        className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[14px] bg-foreground/[0.06] text-muted disabled:opacity-60"
      >
        {photoUrl ? (
          <Image src={photoUrl} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          // Invoked as a plain function, not <CategoryIcon /> — see the
          // matching comment in modification-list.tsx's ModificationIcon.
          getCategoryIcon(category, rawName)({ className: "h-6 w-6" })
        )}
        {isUploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white">
            <Spinner className="h-5 w-5" />
          </span>
        )}
      </button>
    </div>
  );
}
