"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { createAdCampaignAction } from "@/features/ads/actions";
import { NativeCheckoutGate } from "@/features/auth/native-checkout-gate";
import { AD_TIERS, type AdTier } from "@/lib/db/ad-campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { GalleryIcon } from "@/components/ui/icons";
import { TierPicker, type TierMetal } from "@/components/ui/tier-picker";

const TIER_ORDER: AdTier[] = ["starter", "standard", "featured"];
const TIER_METALS: Record<AdTier, TierMetal> = {
  starter: "silver",
  standard: "gold",
  featured: "diamond",
};
const HEADLINE_MAX = 80;
const CAPTION_MAX = 200;

function destinationHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.hostname
      : null;
  } catch {
    return null;
  }
}

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

  async function handleFile(selected: File) {
    const compressed = await compressImageIfNeeded(selected, MAX_IMAGE_BYTES);
    const validationError = validateImageFile(compressed);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setFile(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
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
      // NativeCheckoutGate (wrapping this whole form, see the return
      // below) guarantees this only ever runs on non-native, so this
      // never needs to branch on platform itself.
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
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (!result?.url) {
        setError("Couldn't start checkout. Try again.");
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Couldn't submit that. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const hostname = destinationUrl ? destinationHostname(destinationUrl) : null;

  return (
    <NativeCheckoutGate nextPath="/advertise" what="Creating an ad">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <Callout tone="danger">{error}</Callout>}

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label className="mb-0">Preview</Label>
            <span className="text-xs text-muted">
              This is exactly how it renders in the feed
            </span>
          </div>

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

          {/* Mirrors sponsored-slide.tsx's actual rendering (full-bleed
            image, bottom gradient, Sponsored chip, headline/caption/CTA)
            inside a phone-shaped frame — so an advertiser sees the real
            result instead of guessing from a plain image thumbnail. */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group relative block aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-2xl bg-surface-raised ring-1 ring-inset ring-white/10 mx-auto sm:mx-0"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a stored asset
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-white/15 p-4 text-center">
                <GalleryIcon className="h-6 w-6 text-muted" />
                <p className="text-xs font-medium text-foreground">
                  Add your ad image
                </p>
                <p className="text-[0.65rem] text-muted">
                  Full-bleed vertical — a tall or portrait photo fills the frame
                  best
                </p>
              </div>
            )}

            <div className="pointer-events-none absolute bottom-2.5 right-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[0.6rem] font-medium text-white">
              Sponsored
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2.5 pb-3">
              <p className="max-w-[calc(100%-3rem)] truncate text-sm font-bold leading-snug text-white">
                {headline || "Your headline here"}
              </p>
              {caption && (
                <p className="mt-0.5 line-clamp-2 max-w-[calc(100%-3rem)] text-[0.65rem] text-white/85">
                  {caption}
                </p>
              )}
              <span className="mt-1.5 inline-block rounded-full bg-accent px-2.5 py-1 text-[0.65rem] font-semibold text-accent-foreground">
                Learn more
              </span>
            </div>

            {previewUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                <span className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
                  Change image
                </span>
              </div>
            )}
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label htmlFor="headline" className="mb-0">
              Headline
            </Label>
            <span className="text-xs text-muted">
              {headline.length}/{HEADLINE_MAX}
            </span>
          </div>
          <Input
            id="headline"
            required
            maxLength={HEADLINE_MAX}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Save 20% on coilovers this month"
          />
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label htmlFor="caption" className="mb-0">
              Body text (optional)
            </Label>
            <span className="text-xs text-muted">
              {caption.length}/{CAPTION_MAX}
            </span>
          </div>
          <textarea
            id="caption"
            maxLength={CAPTION_MAX}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            className="glass-inset w-full resize-none rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent/60 focus:outline-none"
          />
        </div>

        <div>
          <Label htmlFor="destination">Where should this link to?</Label>
          <Input
            id="destination"
            type="url"
            required
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://yourshop.com"
          />
          {destinationUrl && (
            <p
              className={`mt-1.5 text-xs ${hostname ? "text-muted" : "text-danger"}`}
            >
              {hostname
                ? `Tapping the ad opens ${hostname}`
                : "Needs a full URL, starting with https://"}
            </p>
          )}
        </div>

        <div>
          <Label>Plan</Label>
          <TierPicker
            name="ad-tier"
            value={tier}
            onChange={(id) => setTier(id as AdTier)}
            options={TIER_ORDER.map((t) => ({
              id: t,
              metal: TIER_METALS[t],
              priceCents: AD_TIERS[t].priceCents,
              subtitle: `${AD_TIERS[t].durationDays} days in the feed`,
            }))}
          />
        </div>

        <div>
          <Button type="submit" disabled={isSubmitting} className="w-full py-3">
            {isSubmitting
              ? "Starting checkout…"
              : `Continue to payment · $${(AD_TIERS[tier].priceCents / 100).toFixed(0)}`}
          </Button>
          <p className="mt-3 text-xs text-muted">
            Every ad is reviewed before it goes live in the feed. It&apos;s
            clearly labeled &ldquo;Sponsored&rdquo; there — SORZA never presents
            paid placements as organic posts.
          </p>
        </div>
      </form>
    </NativeCheckoutGate>
  );
}
