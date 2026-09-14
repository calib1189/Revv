"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadAudio } from "@/lib/storage/upload";
import { createSound, type Sound } from "@/lib/db/sounds";
import { validateAudioFile, validateAudioDuration } from "@/lib/validation/media";
import { validateSoundForm } from "@/lib/validation/sound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { CloseIcon } from "@/components/ui/icons";

/** Anyone can add their own sound to the shared library — the same
 * "people can add their own sounds, others reuse them" mechanic as
 * TikTok's own catalog. Uploads go straight through the browser Supabase
 * client (RLS enforces owner_id = auth.uid()), same convention as photo/
 * video posts in compose-post-form.tsx — no Server Action needed for the
 * write itself. */
export function SoundUploadForm({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: (sound: Sound) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) return setError("Choose an audio file.");
    const fileError = validateAudioFile(file);
    if (fileError) return setError(fileError);

    const formErrors = validateSoundForm({ title, artistName });
    if (formErrors.title) return setError(formErrors.title);
    if (formErrors.artistName) return setError(formErrors.artistName);

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in.");
        setIsSubmitting(false);
        return;
      }

      const uploaded = await uploadAudio(supabase, user.id, file);
      const durationError = validateAudioDuration(uploaded.durationMs / 1000);
      if (durationError) {
        setError(durationError);
        setIsSubmitting(false);
        return;
      }

      const sound = await createSound(supabase, {
        owner_id: user.id,
        title: title.trim(),
        artist_name: artistName.trim() || null,
        storage_path: uploaded.storagePath,
        duration_ms: uploaded.durationMs,
        source: "user_upload",
      });

      onUploaded(sound);
    } catch {
      setError("Couldn't upload that sound. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="glass-raised relative flex w-full max-w-md flex-col gap-4 rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Upload a sound</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {error && <Callout tone="danger">{error}</Callout>}

        <p className="text-xs text-muted">
          Only upload audio you made or have the rights to share — other members will be able to
          use it in their own videos.
        </p>

        <div>
          <Label htmlFor="sound-title">Name</Label>
          <Input
            id="sound-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Late Night Cruise"
            required
          />
        </div>

        <div>
          <Label htmlFor="sound-artist">Artist (optional)</Label>
          <Input
            id="sound-artist"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Your name or handle"
          />
        </div>

        <div>
          <Label htmlFor="sound-file">Audio file</Label>
          <input
            ref={fileInputRef}
            id="sound-file"
            type="file"
            accept="audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-accent-foreground"
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-1 w-full py-3 text-base">
          {isSubmitting ? "Uploading…" : "Upload"}
        </Button>
      </form>
    </div>
  );
}
