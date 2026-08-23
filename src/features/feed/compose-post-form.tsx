"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { createPost } from "@/lib/db/posts";
import { addPostMedia } from "@/lib/db/post-media";
import { validateImageFile } from "@/lib/validation/media";
import { validateCaption, validatePhotoCount } from "@/lib/validation/post";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import type { Vehicle } from "@/lib/db/vehicles";

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

export function ComposePostForm({
  userId,
  vehicles,
}: {
  userId: string;
  vehicles: Vehicle[];
}) {
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [caption, setCaption] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleSelectFiles(files: FileList) {
    const next: SelectedPhoto[] = [...photos];
    for (const file of Array.from(files)) {
      const fileError = validateImageFile(file);
      if (fileError) {
        setError(fileError);
        continue;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const photoError = validatePhotoCount(photos.length);
    if (photoError) return setError(photoError);
    const captionError = validateCaption(caption);
    if (captionError) return setError(captionError);

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const post = await createPost(supabase, {
        author_id: userId,
        vehicle_id: vehicleId || null,
        post_type: "photo",
        caption: caption.trim() || null,
      });

      let position = 0;
      for (const photo of photos) {
        const uploaded = await uploadImage(supabase, userId, photo.file);
        const media = await createMedia(supabase, {
          owner_id: userId,
          storage_path: uploaded.storagePath,
          kind: "image",
          width: uploaded.width,
          height: uploaded.height,
        });
        await addPostMedia(supabase, post.id, media.id, position);
        position += 1;
      }

      router.push(`/p/${post.id}`);
    } catch {
      setError("Couldn't publish that post. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && <Callout tone="danger">{error}</Callout>}

      <div>
        <Label>Photos</Label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleSelectFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset */}
                <img
                  src={photo.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5 text-sm"
          onClick={() => inputRef.current?.click()}
        >
          {photos.length > 0 ? "Add more photos" : "Choose photos"}
        </Button>
      </div>

      {vehicles.length > 0 && (
        <div>
          <Label htmlFor="vehicle">Tag a vehicle</Label>
          <select
            id="vehicle"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">None</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label htmlFor="caption">Caption</Label>
        <textarea
          id="caption"
          rows={4}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What's the story?"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Publishing…" : "Publish"}
      </Button>
    </form>
  );
}
