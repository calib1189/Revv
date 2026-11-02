import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadErrorMessage } from "@/lib/storage/upload";
import { createMedia, publicMediaUrl } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";

export type ShopPictureUpload = { mediaId: string; url: string } | { error: string };

/** Uploads a photo to become a shop's profile picture. It's public on a
 * real business's listing, so it goes through the automated moderation
 * check before any byte is stored, like every photo other people see.
 * Saving it as the shop's picture is a separate step (the promote form
 * or saveShopPictureAction). */
export async function uploadShopPicture(userId: string, rawFile: File): Promise<ShopPictureUpload> {
  try {
    const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
    const fileError = validateImageFile(file);
    if (fileError) return { error: fileError };

    const supabase = createClient();
    const uploaded = await uploadImage(supabase, userId, file, { moderate: true });
    const media = await createMedia(supabase, {
      owner_id: userId,
      storage_path: uploaded.storagePath,
      kind: "image",
      width: uploaded.width,
      height: uploaded.height,
    });
    return { mediaId: media.id, url: publicMediaUrl(supabase, uploaded.storagePath) };
  } catch (err) {
    return { error: uploadErrorMessage(err, "Couldn't upload that photo. Try again.") };
  }
}
