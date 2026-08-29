"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { publicMediaUrl } from "@/lib/db/media";
import { updateProfileAvatar } from "@/lib/db/profiles";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { Avatar } from "@/features/feed/avatar";
import { Button } from "@/components/ui/button";

export function EditAvatarForm({
  userId,
  username,
  initialAvatarUrl,
}: {
  userId: string;
  username: string;
  initialAvatarUrl: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSelect(rawFile: File) {
    setError(null);
    const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
    const fileError = validateImageFile(file);
    if (fileError) return setError(fileError);

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
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
      await updateProfileAvatar(supabase, userId, media.id);
      setPreviewUrl(publicMediaUrl(supabase, uploaded.storagePath));
      router.refresh();
    } catch {
      setError("Couldn't update your profile picture. Try again.");
      setPreviewUrl(initialAvatarUrl);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar username={username} avatarUrl={previewUrl} className="h-16 w-16 flex-shrink-0 text-xl" />
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleSelect(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5 text-sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "Uploading…" : "Change profile picture"}
        </Button>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
