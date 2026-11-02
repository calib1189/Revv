"use client";

import { useEffect, useRef } from "react";
import { blendFilterPreset, type FilterPreset } from "@/features/editor/filters";
import { applyFilter } from "@/features/editor/pixel-filters";

/** Renders one filter option as the user's own captured frame with that
 * preset actually applied (at full strength — the intensity slider's
 * live effect is already visible on the main preview canvas this sits
 * next to, so the swatch's job is just "what does this look like,"
 * not re-deriving the current intensity too). Falls back to a plain
 * label-only button when no preview frame could be captured yet
 * (metadata still loading) rather than showing nothing tappable. */
export function FilterSwatch({
  preset,
  previewSource,
  selected,
  onClick,
}: {
  preset: FilterPreset;
  previewSource: ImageData | null;
  selected: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewSource) return;
    canvas.width = previewSource.width;
    canvas.height = previewSource.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frame = new ImageData(
      new Uint8ClampedArray(previewSource.data),
      previewSource.width,
      previewSource.height,
    );
    if (preset.id !== "original") applyFilter(frame, blendFilterPreset(preset, 1));
    ctx.putImageData(frame, 0, 0);
  }, [preset, previewSource]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="pressable flex flex-shrink-0 flex-col items-center gap-1.5"
    >
      <span
        className={`block h-[76px] w-14 overflow-hidden rounded-[14px] bg-white/[0.08] transition-shadow duration-200 ${
          selected ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""
        }`}
      >
        {previewSource && <canvas ref={canvasRef} className="h-full w-full object-cover" />}
      </span>
      <span className={`text-[0.6875rem] ${selected ? "font-semibold text-white" : "font-medium text-white/60"}`}>
        {preset.label}
      </span>
    </button>
  );
}
