"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { createAdCampaignAction } from "@/features/ads/actions";
import { NativeCheckoutGate } from "@/features/auth/native-checkout-gate";
import { SponsoredPreview } from "@/features/ads/sponsored-preview";
import { AD_TIERS, type AdTier } from "@/lib/db/ad-campaigns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { Spinner } from "@/components/ui/spinner";
import { CheckIcon, GalleryIcon, LockIcon } from "@/components/ui/icons";
import { TierPicker, type TierMetal } from "@/components/ui/tier-picker";

const TIER_ORDER: AdTier[] = ["starter", "standard", "featured"];
const TIER_METALS: Record<AdTier, TierMetal> = {
  starter: "silver",
  standard: "gold",
  featured: "diamond",
};
const HEADLINE_MAX = 80;
const CAPTION_MAX = 200;

type StepId = "design" | "link" | "plan" | "review";

/** One decision per screen, payment last — the old single long form
 * opened on a price picker and a pay button, which read as "buy this"
 * before anyone had even seen what they'd be buying. */
const STEPS: { id: StepId; label: string; title: string; description: string }[] = [
  {
    id: "design",
    label: "Design",
    title: "Design your ad",
    description: "Pick a photo and write a headline. The preview is exactly how it shows in the feed.",
  },
  {
    id: "link",
    label: "Link",
    title: "Where should it go?",
    description: "Tapping Learn more on your ad opens this page.",
  },
  {
    id: "plan",
    label: "Plan",
    title: "How long should it run?",
    description: "Plans only differ in how long your ad stays in the feed.",
  },
  {
    id: "review",
    label: "Review",
    title: "Review your ad",
    description: "Check it over once more. Payment happens on a secure Stripe page next.",
  },
];

function destinationHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.includes(".")
      ? parsed.hostname
      : null;
  } catch {
    return null;
  }
}

/** "yourshop.com" → "https://yourshop.com", so people who type an address
 * the way they'd say it aren't told it's invalid. */
function withProtocol(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function AdCampaignForm({ userId }: { userId: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [tier, setTier] = useState<AdTier>("starter");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];
  const hostname = destinationHostname(withProtocol(destinationUrl));
  const plan = AD_TIERS[tier];

  // Each picked photo gets its own object URL; free the old one once it's
  // replaced (and the last one when the builder goes away).
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

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

  const stepReady =
    step.id === "design" ? Boolean(file) && headline.trim().length > 0 : step.id === "link" ? hostname !== null : true;

  const stepHint =
    step.id === "design"
      ? !file && !headline.trim()
        ? "Add a photo and a headline to continue."
        : !file
          ? "Add a photo to continue."
          : "Add a headline to continue."
      : step.id === "link"
        ? "Add the link your ad should open."
        : null;

  function goTo(index: number) {
    setError(null);
    setStepIndex(index);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step.id !== "review") {
      if (step.id === "link") setDestinationUrl(withProtocol(destinationUrl));
      if (stepReady) goTo(stepIndex + 1);
      return;
    }
    if (!file) {
      goTo(0);
      setError("Add a photo for your ad.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      // NativeCheckoutGate (wrapping this whole builder, see the return
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
        destinationUrl: withProtocol(destinationUrl),
        tier,
      });
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      if (!result?.url) {
        setError("Couldn't start checkout. Try again.");
        setIsSubmitting(false);
        return;
      }
      // Left in the submitting state on purpose: the page is about to
      // navigate to Stripe, and re-enabling the button would invite a
      // second tap that creates a second campaign.
      window.location.href = result.url;
    } catch {
      setError("Couldn't submit that. Try again.");
      setIsSubmitting(false);
    }
  }

  const photo = previewUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a stored asset
    <img src={previewUrl} alt="" className="h-full w-full object-cover" />
  ) : null;

  return (
    <NativeCheckoutGate nextPath="/advertise/new" what="Creating an ad">
      <div ref={topRef} className="scroll-mt-20" />
      <form onSubmit={handleSubmit} noValidate>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) void handleFile(selected);
            e.target.value = "";
          }}
        />

        <div className="mb-6">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i <= stepIndex ? "bg-accent" : "bg-foreground/10"
                }`}
              />
            ))}
          </div>
          <p className="mt-3 text-[0.8125rem] font-medium text-muted">
            Step {stepIndex + 1} of {STEPS.length} · {step.label}
          </p>
          <h1 className="mt-1 text-balance text-[1.75rem] font-bold leading-tight tracking-[-0.025em]">
            {step.title}
          </h1>
          <p className="mt-1.5 max-w-prose text-[0.9375rem] leading-relaxed text-muted">{step.description}</p>
        </div>

        {error && (
          <div className="mb-5">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}

        <div key={step.id} className="animate-panel-up">
          {step.id === "design" && (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  aria-label={previewUrl ? "Change photo" : "Add a photo"}
                  className="pressable relative rounded-[26px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
                >
                  <SponsoredPreview
                    media={photo}
                    headline={headline.trim() || "Your headline here"}
                    caption={caption.trim() || null}
                    className="w-[160px] sm:w-[188px]"
                    placeholder={
                      <span className="absolute inset-x-2.5 bottom-[5.25rem] top-2.5 flex flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-white/15 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white">
                          <GalleryIcon className="h-5 w-5" />
                        </span>
                        <span className="text-[0.8125rem] font-semibold text-white">Add a photo</span>
                      </span>
                    }
                  />
                  {previewUrl && (
                    <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1 text-[0.6875rem] font-semibold text-white backdrop-blur-md">
                      Change photo
                    </span>
                  )}
                </button>
                <p className="text-[0.75rem] text-muted">Tall photos fill the frame best</p>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-5">
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <Label htmlFor="headline" className="mb-0">
                      Headline
                    </Label>
                    <span className="text-xs tabular-nums text-muted">
                      {headline.length}/{HEADLINE_MAX}
                    </span>
                  </div>
                  <Input
                    id="headline"
                    maxLength={HEADLINE_MAX}
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="What should people know first?"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <Label htmlFor="caption" className="mb-0">
                      Body text <span className="font-normal text-muted">(optional)</span>
                    </Label>
                    <span className="text-xs tabular-nums text-muted">
                      {caption.length}/{CAPTION_MAX}
                    </span>
                  </div>
                  <textarea
                    id="caption"
                    maxLength={CAPTION_MAX}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    placeholder="A line or two of detail."
                    className="glass-inset w-full resize-none rounded-[14px] px-4 py-3 text-foreground placeholder:text-muted/60 transition-[box-shadow,border-color] focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15"
                  />
                </div>
              </div>
            </div>
          )}

          {step.id === "link" && (
            <div>
              <Label htmlFor="destination">Link</Label>
              <Input
                id="destination"
                type="url"
                inputMode="url"
                autoComplete="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                onBlur={() => setDestinationUrl(withProtocol(destinationUrl))}
                placeholder="yourshop.com"
              />
              {destinationUrl.trim() && (
                <p
                  className={`mt-2 flex items-center gap-1.5 text-[0.8125rem] ${hostname ? "text-success" : "text-danger"}`}
                >
                  {hostname && <CheckIcon className="h-4 w-4" />}
                  {hostname ? `Tapping your ad opens ${hostname}` : "That doesn't look like a web address yet."}
                </p>
              )}
            </div>
          )}

          {step.id === "plan" && (
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
          )}

          {step.id === "review" && (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              <div className="flex justify-center">
                <SponsoredPreview
                  media={photo}
                  headline={headline.trim()}
                  caption={caption.trim() || null}
                  className="w-[168px]"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <ul className="glass-raised elev-1 overflow-hidden rounded-[22px]">
                  <ReviewRow label="Ad" value={headline.trim()} onEdit={() => goTo(0)} />
                  <ReviewRow label="Link" value={hostname ?? destinationUrl} onEdit={() => goTo(1)} divider />
                  <ReviewRow
                    label="Plan"
                    value={`${plan.label} · ${plan.durationDays} days`}
                    onEdit={() => goTo(2)}
                    divider
                  />
                  <li className="relative flex items-center justify-between px-4 py-3.5">
                    <span aria-hidden className="absolute inset-x-4 top-0 h-px bg-border" />
                    <span className="text-[0.9375rem] font-semibold">Total</span>
                    <span className="text-[1.25rem] font-bold tabular-nums">{dollars(plan.priceCents)}</span>
                  </li>
                </ul>
                <p className="flex gap-2 px-1 text-[0.8125rem] leading-relaxed text-muted">
                  <LockIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  One payment, no subscription. After you pay, SORZA reviews your ad before it goes
                  live, and it&apos;s always labeled Sponsored in the feed.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pinned just above the tab bar so the next step is always one
            thumb-reach away, however long the current one is. */}
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[5] -mx-4 mt-8 border-t border-border/60 bg-background/85 px-4 pb-3 pt-3 backdrop-blur-xl sm:mx-0 sm:rounded-[22px] sm:border sm:px-3">
          <div className="flex items-center gap-2.5">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => goTo(stepIndex - 1)}
                disabled={isSubmitting}
                className="pressable h-12 rounded-full px-5 text-[0.9375rem] font-semibold text-foreground disabled:opacity-50"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={!stepReady || isSubmitting}
              className="pressable inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-semibold text-accent-foreground transition-opacity disabled:opacity-40"
            >
              {isSubmitting && <Spinner className="h-4 w-4" />}
              {step.id !== "review"
                ? "Continue"
                : isSubmitting
                  ? "Starting checkout…"
                  : `Continue to payment · ${dollars(plan.priceCents)}`}
            </button>
          </div>
          {!stepReady && stepHint && (
            <p className="mt-2 text-center text-[0.75rem] text-muted">{stepHint}</p>
          )}
        </div>
      </form>
    </NativeCheckoutGate>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
  divider = false,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  divider?: boolean;
}) {
  return (
    <li className="relative flex items-center gap-3 px-4 py-3.5">
      {divider && <span aria-hidden className="absolute inset-x-4 top-0 h-px bg-border" />}
      <div className="min-w-0 flex-1">
        <p className="text-[0.75rem] font-medium text-muted">{label}</p>
        <p className="mt-0.5 truncate text-[0.9375rem] font-semibold">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex-shrink-0 rounded-full px-2 py-1 text-[0.875rem] font-semibold text-accent"
      >
        Edit
      </button>
    </li>
  );
}
