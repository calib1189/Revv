"use client";

import { useRef, useState } from "react";
import { identifyVehicleAction } from "@/features/garage/actions";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Spinner } from "@/components/ui/spinner";
import { CameraIcon, ChevronRightIcon } from "@/components/ui/icons";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { MAX_IDENTIFY_IMAGE_BYTES } from "@/lib/validation/media";
import type { VehicleIdentification } from "@/lib/providers/vision-provider";
import type { VehicleFormValues } from "@/features/garage/vehicle-form";
import { AiDisclosure } from "@/features/garage/ai-disclosure";

export function AiIdentifyPanel({
  onUseSuggestion,
}: {
  onUseSuggestion: (values: VehicleFormValues) => void;
}) {
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [suggestion, setSuggestion] = useState<VehicleIdentification | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setSuggestion(null);
    setPreviewUrl(URL.createObjectURL(file));
    setIsIdentifying(true);

    try {
      // No upload here is ever too large — an oversized photo (a
      // modern phone photo easily clears 15-20MB) gets downscaled and
      // re-encoded client-side before it ever leaves the browser,
      // instead of shipping the original over the network only to be
      // rejected server-side (or by Gemini's own payload limit) after
      // the fact. See compressImageIfNeeded's own comment for why this
      // path targets a tighter cap than a plain cover-photo upload.
      const uploadFile = await compressImageIfNeeded(file, MAX_IDENTIFY_IMAGE_BYTES);
      const formData = new FormData();
      formData.set("photo", uploadFile);
      const result = await identifyVehicleAction(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        // The model is deliberately allowed to return null for every
        // field rather than guess (see the prompt in
        // gemini-vision-provider.ts) — a heavily modified build, an
        // unusual angle, or a less common vehicle can genuinely come
        // back with nothing to show. Surfacing that as an explicit
        // message instead of a near-blank "AI suggestion" card is the
        // difference between "this looks broken" and "try a clearer
        // photo, or just fill it in yourself".
        const identifiedNothing =
          !result.data.year && !result.data.make && !result.data.model;
        if (identifiedNothing) {
          setError(
            "Couldn't confidently identify that vehicle from this photo — try a clearer, more direct angle, or fill in the details below yourself.",
          );
        } else {
          setSuggestion(result.data);
        }
      }
    } catch {
      setError("Couldn't identify that photo. Try again.");
    } finally {
      setIsIdentifying(false);
    }
  }

  const confidencePercent = suggestion
    ? Math.round(suggestion.confidence * 100)
    : 0;
  const suggestionTitle = suggestion
    ? [suggestion.year, suggestion.make, suggestion.model, suggestion.trim]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div className="glass-raised elev-1 mb-7 overflow-hidden rounded-[22px]">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={isIdentifying}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center gap-3.5 p-4 text-left transition-colors active:bg-foreground/[0.06] disabled:opacity-70"
      >
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
          <CameraIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-semibold">
            {isIdentifying ? "Identifying…" : "Identify from a photo"}
          </span>
          <span className="block text-[0.8125rem] leading-snug text-muted">
            Fills in year, make, model, trim, and category for you to check.
          </span>
        </span>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
      </button>
      <AiDisclosure className="-mt-1 px-4 pb-4" />
      <div className="px-4 pb-4 empty:hidden">

      {error && <Callout tone="danger">{error}</Callout>}

      {(previewUrl || suggestion) && !error && (
        <div className="flex items-start gap-3.5 border-t border-border pt-4">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: preview
            <img
              src={previewUrl}
              alt=""
              className="h-[72px] w-[72px] flex-shrink-0 rounded-[14px] object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            {isIdentifying ? (
              <div className="flex items-center gap-2 pt-1 text-[0.875rem] text-muted">
                <Spinner className="h-4 w-4" />
                Analyzing photo…
              </div>
            ) : suggestion ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-accent">
                    {suggestion.isMock ? "Mock AI suggestion" : "AI suggestion"}
                  </span>
                  <span className="text-[0.75rem] text-muted">
                    <span className="numeral">{confidencePercent}%</span> confidence
                  </span>
                </div>
                <p className="mt-1.5 text-[1rem] font-semibold leading-snug">{suggestionTitle}</p>
                {suggestion.category && (
                  <p className="mt-0.5 text-[0.8125rem] text-muted">{VEHICLE_CATEGORY_LABELS[suggestion.category]}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    className="h-9 px-4 py-0 text-[0.875rem] font-semibold"
                    onClick={() =>
                      onUseSuggestion({
                        year: suggestion.year,
                        make: suggestion.make,
                        model: suggestion.model,
                        trim: suggestion.trim,
                        category: suggestion.category,
                      })
                    }
                  >
                    Use details
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 px-4 py-0 text-[0.875rem] font-semibold"
                    onClick={() => {
                      setSuggestion(null);
                      setPreviewUrl(null);
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
