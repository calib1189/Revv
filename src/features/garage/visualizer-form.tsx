"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateVisualizationAction } from "@/features/garage/visualize-actions";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { createPost } from "@/lib/db/posts";
import { addPostMedia } from "@/lib/db/post-media";
import { validateImageFile } from "@/lib/validation/media";
import { validatePrompt } from "@/lib/validation/visualization";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import type { GeneratedImage } from "@/lib/providers/image-generation-provider";

function base64ToFile(base64: string, mimeType: string, name: string): File {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return new File([bytes], name, { type: mimeType });
}

export function VisualizerForm({
  userId,
  vehicleId,
}: {
  userId: string;
  vehicleId: string;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleSelectFile(file: File) {
    const fileError = validateImageFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }
    setError(null);
    setResult(null);
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleGenerate() {
    setError(null);
    if (!photo) return setError("Choose a photo first.");
    const promptError = validatePrompt(prompt);
    if (promptError) return setError(promptError);

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.set("photo", photo);
      formData.set("prompt", prompt);
      const response = await generateVisualizationAction(formData);
      if (response.error) setError(response.error);
      else if (response.data) setResult(response.data);
    } catch {
      setError("Couldn't generate a visualization. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleShare() {
    if (!photo || !result) return;
    setIsSharing(true);
    setError(null);

    try {
      const supabase = createClient();
      const post = await createPost(supabase, {
        author_id: userId,
        vehicle_id: vehicleId,
        post_type: "photo",
        caption: `AI visualization (mock): ${prompt.trim()}`,
      });

      const beforeUploaded = await uploadImage(supabase, userId, photo);
      const beforeMedia = await createMedia(supabase, {
        owner_id: userId,
        storage_path: beforeUploaded.storagePath,
        kind: "image",
        width: beforeUploaded.width,
        height: beforeUploaded.height,
      });
      await addPostMedia(supabase, post.id, beforeMedia.id, 0);

      const generatedFile = base64ToFile(
        result.imageBase64,
        result.mimeType,
        "visualization.jpg",
      );
      const afterUploaded = await uploadImage(supabase, userId, generatedFile);
      const afterMedia = await createMedia(supabase, {
        owner_id: userId,
        storage_path: afterUploaded.storagePath,
        kind: "image",
        width: afterUploaded.width,
        height: afterUploaded.height,
      });
      await addPostMedia(supabase, post.id, afterMedia.id, 1);

      router.push(`/p/${post.id}`);
    } catch {
      setError("Couldn't share that post. Try again.");
      setIsSharing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <Callout tone="danger">{error}</Callout>}

      <div>
        <Label>Photo</Label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleSelectFile(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5 text-sm"
          onClick={() => inputRef.current?.click()}
        >
          {photo ? "Choose a different photo" : "Choose photo"}
        </Button>
      </div>

      <div>
        <Label htmlFor="prompt">Describe the mod</Label>
        <textarea
          id="prompt"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Matte black hood wrap, lowered stance, bronze wheels…"
          className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent/60 focus:outline-none"
        />
      </div>

      <Button
        type="button"
        disabled={!photo || isGenerating}
        onClick={handleGenerate}
        className="self-start"
      >
        {isGenerating ? "Generating…" : "Generate visualization"}
      </Button>

      {(previewUrl || result) && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium">Before / after</span>
            {result?.isMock && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
                Mock — no real image was generated
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="overflow-hidden rounded-lg bg-surface">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- local blob: preview
                <img src={previewUrl} alt="Before" className="aspect-square w-full object-cover" />
              )}
              <p className="px-2 py-1 text-center text-xs text-muted">Before</p>
            </div>
            <div className="overflow-hidden rounded-lg bg-surface">
              {result ? (
                // eslint-disable-next-line @next/next/no-img-element -- data: URL from server action response
                <img
                  src={`data:${result.mimeType};base64,${result.imageBase64}`}
                  alt="After"
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-xs text-muted">
                  {isGenerating ? "Generating…" : "Not generated yet"}
                </div>
              )}
              <p className="px-2 py-1 text-center text-xs text-muted">After</p>
            </div>
          </div>

          {result && (
            <Button
              type="button"
              disabled={isSharing}
              onClick={handleShare}
              className="mt-4 self-start"
            >
              {isSharing ? "Sharing…" : "Share to post"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
