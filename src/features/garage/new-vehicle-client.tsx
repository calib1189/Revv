"use client";

import { useRef, useState } from "react";
import { AiIdentifyPanel } from "@/features/garage/ai-identify-panel";
import { VehicleForm, type VehicleFormValues } from "@/features/garage/vehicle-form";
import { createVehicleAction, type VehicleFormState } from "@/features/garage/actions";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadErrorMessage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";

export function NewVehicleClient({ userId }: { userId: string }) {
  const [initialValues, setInitialValues] = useState<VehicleFormValues>();
  const [photo, setPhoto] = useState<File | null>(null);
  // A retry after a form error reuses the upload instead of storing the
  // same photo twice.
  const uploaded = useRef<{ file: File; mediaId: string } | null>(null);

  async function uploadCover(file: File): Promise<string> {
    const compressed = await compressImageIfNeeded(file, MAX_IMAGE_BYTES);
    const validationError = validateImageFile(compressed);
    if (validationError) throw new Error(validationError);
    const supabase = createClient();
    const image = await uploadImage(supabase, userId, compressed, { moderate: true });
    const media = await createMedia(supabase, {
      owner_id: userId,
      storage_path: image.storagePath,
      kind: "image",
      width: image.width,
      height: image.height,
    });
    return media.id;
  }

  // The photo that identified the car becomes its cover photo, so the
  // new vehicle can be rated immediately without a second upload step.
  async function createWithCover(
    prevState: VehicleFormState,
    formData: FormData,
  ): Promise<VehicleFormState> {
    if (photo) {
      if (uploaded.current?.file !== photo) {
        try {
          uploaded.current = { file: photo, mediaId: await uploadCover(photo) };
        } catch (err) {
          return {
            error: uploadErrorMessage(
              err,
              "Couldn't upload that photo as the cover. Try again, or dismiss the photo to add the vehicle without it.",
            ),
          };
        }
      }
      formData.set("hero_media_id", uploaded.current.mediaId);
    }
    // Outside the try on purpose: a successful create redirects, and
    // that must not be caught as an upload error.
    return createVehicleAction(prevState, formData);
  }

  return (
    <>
      <AiIdentifyPanel onUseSuggestion={setInitialValues} onPhotoChange={setPhoto} />
      {/* Keyed on the suggestion so "Use details" remounts the whole
          form. Make, model and category live in VehicleForm's state,
          which only reads its initial values on mount: keying just the
          inner <form> refilled year and trim but left those blank. */}
      <VehicleForm
        key={JSON.stringify(initialValues ?? {})}
        action={createWithCover}
        initialValues={initialValues}
        submitLabel="Add vehicle"
      />
    </>
  );
}
