"use client";

import { useRef, useState } from "react";
import { identifyVehicleAction } from "@/features/garage/actions";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import type { VehicleIdentification } from "@/lib/providers/vision-provider";
import type { VehicleFormValues } from "@/features/garage/vehicle-form";

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
      const formData = new FormData();
      formData.set("photo", file);
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
    <div className="glass mb-6 rounded-2xl p-4">
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

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Identify with a photo</p>
          <p className="text-xs text-muted">
            Upload a photo and SORZA will guess year, make, model, trim, and category.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="flex-shrink-0 px-3 py-1.5 text-sm"
          disabled={isIdentifying}
          onClick={() => inputRef.current?.click()}
        >
          {isIdentifying ? "Identifying…" : "Choose photo"}
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      {(previewUrl || suggestion) && !error && (
        <div className="mt-4 flex items-center gap-3">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: preview
            <img
              src={previewUrl}
              alt=""
              className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            {isIdentifying ? (
              <p className="text-sm text-muted">Analyzing photo…</p>
            ) : suggestion ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
                    {suggestion.isMock ? "Mock AI suggestion" : "AI suggestion"}
                  </span>
                  <span className="text-xs text-muted">
                    {confidencePercent}% confidence
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-medium">
                  {suggestionTitle}
                </p>
                {suggestion.category && (
                  <span className="glass mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-muted">
                    {VEHICLE_CATEGORY_LABELS[suggestion.category]}
                  </span>
                )}
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onUseSuggestion({
                        year: suggestion.year,
                        make: suggestion.make,
                        model: suggestion.model,
                        trim: suggestion.trim,
                        category: suggestion.category,
                      })
                    }
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Use these details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestion(null);
                      setPreviewUrl(null);
                    }}
                    className="text-sm text-muted hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
