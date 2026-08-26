"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { validateImageFile } from "@/lib/validation/media";
import { createAdCampaignAction } from "@/features/ads/actions";
import { AD_TIERS, type AdTier } from "@/lib/db/ad-campaigns";
import { Button } from "@/components/ui/button";

const TIER_ORDER: AdTier[] = ["starter", "standard", "featured"];

export function AdCampaignForm({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [tier, setTier] = useState<AdTier>("starter");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(selected: File) {
    const validationError = validateImageFile(selected);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Add an image for your ad.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
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
      const result = await createAdCampaignAction({
        mediaId: media.id,
        headline,
        caption,
        destinationUrl,
        tier,
      });
      if (result?.error) setError(result.error);
      // On success the action itself redirects to Stripe — nothing left
      // to do here.
    } catch {
      setError("Couldn't submit that. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <label className="mb-2 block text-sm font-medium">Ad image</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleFile(selected);
            e.target.value = "";
          }}
        />
        {previewUrl ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="relative block aspect-video w-full overflow-hidden rounded-2xl bg-surface-raised"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a stored asset */}
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          </button>
        ) : (
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            Choose image
          </Button>
        )}
      </div>

      <div>
        <label htmlFor="headline" className="mb-2 block text-sm font-medium">
          Headline
        </label>
        <input
          id="headline"
          required
          maxLength={80}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Save 20% on coilovers this month"
          className="glass-inset w-full rounded-xl px-3 py-2.5 text-sm text-foreground focus:border-accent/60 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="caption" className="mb-2 block text-sm font-medium">
          Body text (optional)
        </label>
        <textarea
          id="caption"
          maxLength={200}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          className="glass-inset w-full resize-none rounded-xl px-3 py-2.5 text-sm text-foreground focus:border-accent/60 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="destination" className="mb-2 block text-sm font-medium">
          Where should this link to?
        </label>
        <input
          id="destination"
          type="url"
          required
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder="https://yourshop.com"
          className="glass-inset w-full rounded-xl px-3 py-2.5 text-sm text-foreground focus:border-accent/60 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Plan</label>
        <div className="flex flex-col gap-2">
          {TIER_ORDER.map((t) => {
            const info = AD_TIERS[t];
            return (
              <label
                key={t}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
                  tier === t ? "border-accent bg-accent/10" : "border-border"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tier"
                    checked={tier === t}
                    onChange={() => setTier(t)}
                  />
                  <span className="font-medium">{info.label}</span>
                </span>
                <span className="text-muted">
                  ${(info.priceCents / 100).toFixed(0)} · {info.durationDays} days
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Starting checkout…"
          : `Continue to payment · $${(AD_TIERS[tier].priceCents / 100).toFixed(0)}`}
      </Button>
      <p className="text-xs text-muted">
        Every ad is reviewed before it goes live in the feed. It&apos;s clearly
        labeled &ldquo;Sponsored&rdquo; there — REVV never presents paid
        placements as organic posts.
      </p>
    </form>
  );
}
