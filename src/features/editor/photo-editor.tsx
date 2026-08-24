"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { drawFrame } from "@/features/editor/draw-frame";
import { FILTER_PRESETS } from "@/features/editor/filters";
import { aspectNeedsPan } from "@/features/editor/crop";
import type { AspectRatioId, TextLayer } from "@/features/editor/types";
import {
  BackIcon,
  CheckIcon,
  CropIcon,
  TextToolIcon,
  FilterIcon,
  TrashIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";

type Tool = "crop" | "filter" | "text" | null;

const ASPECTS: { id: AspectRatioId; label: string }[] = [
  { id: "9:16", label: "9:16" },
  { id: "4:5", label: "4:5" },
  { id: "1:1", label: "1:1" },
  { id: "original", label: "Original" },
];

const TEXT_COLORS = ["#ffffff", "#ff4433", "#ffd166", "#06d6a0", "#4cc9f0", "#000000"];

const TOOLS: { id: Exclude<Tool, null>; label: string; icon: typeof CropIcon }[] = [
  { id: "crop", label: "Crop", icon: CropIcon },
  { id: "filter", label: "Filters", icon: FilterIcon },
  { id: "text", label: "Text", icon: TextToolIcon },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface PhotoEditState {
  aspect: AspectRatioId;
  panOffset: number;
  filterId: string;
  textLayers: TextLayer[];
}

export function PhotoEditor({
  source,
  onCancel,
  onExported,
}: {
  source: File;
  onCancel: () => void;
  onExported: (file: File) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const sourceUrl = useMemo(() => URL.createObjectURL(source), [source]);

  const [ready, setReady] = useState(false);
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 9, height: 16 });
  const [tool, setTool] = useState<Tool>(null);
  const [state, setState] = useState<PhotoEditState>({
    aspect: "original",
    panOffset: 0.5,
    filterId: "original",
    textLayers: [],
  });
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newTextDraft, setNewTextDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    return () => URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    function onLoaded() {
      setImgDims({ width: img!.naturalWidth, height: img!.naturalHeight });
      setReady(true);
    }
    if (img.complete && img.naturalWidth) onLoaded();
    else img.addEventListener("load", onLoaded);
    return () => img.removeEventListener("load", onLoaded);
  }, []);

  // Canvas resolution follows the chosen aspect — full resolution since a
  // single still frame is cheap to render, unlike a 30fps video loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const MAX = 1080;
    let w: number;
    let h: number;
    if (state.aspect === "9:16") {
      w = 1080;
      h = 1920;
    } else if (state.aspect === "1:1") {
      w = 1080;
      h = 1080;
    } else if (state.aspect === "4:5") {
      w = 1080;
      h = 1350;
    } else {
      const scale = Math.min(1, MAX / Math.max(imgDims.width, imgDims.height));
      w = Math.round(imgDims.width * scale);
      h = Math.round(imgDims.height * scale);
    }
    canvas.width = w;
    canvas.height = h;
    setCanvasSize({ width: w, height: h });
  }, [state.aspect, imgDims, ready]);

  // Redraw whenever anything about the composite changes.
  useEffect(() => {
    if (!ready) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawFrame(ctx, img, canvas.width, canvas.height, state);
  }, [ready, state, canvasSize]);

  function updateState(patch: Partial<PhotoEditState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function addTextLayer() {
    if (!newTextDraft.trim()) return;
    const layer: TextLayer = {
      id: crypto.randomUUID(),
      text: newTextDraft.trim().slice(0, 80),
      x: 0.5,
      y: 0.5,
      color: "#ffffff",
      fontSize: 64,
    };
    setState((s) => ({ ...s, textLayers: [...s.textLayers, layer] }));
    setNewTextDraft("");
    setSelectedTextId(layer.id);
  }

  function updateTextLayer(id: string, patch: Partial<TextLayer>) {
    setState((s) => ({
      ...s,
      textLayers: s.textLayers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }

  function removeTextLayer(id: string) {
    setState((s) => ({ ...s, textLayers: s.textLayers.filter((l) => l.id !== id) }));
    if (selectedTextId === id) setSelectedTextId(null);
  }

  function handlePreviewPointerDown(e: React.PointerEvent) {
    const container = previewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dragTextId = selectedTextId;
    const cropPanEnabled =
      tool === "crop" && aspectNeedsPan(state.aspect, imgDims.width, imgDims.height);
    if (!dragTextId && !cropPanEnabled) return;

    e.preventDefault();
    const imgAspect = imgDims.width / Math.max(1, imgDims.height);
    const targetAspect =
      state.aspect === "9:16"
        ? 9 / 16
        : state.aspect === "1:1"
          ? 1
          : state.aspect === "4:5"
            ? 4 / 5
            : imgAspect;
    const panAxisIsX = imgAspect > targetAspect;

    function move(ev: PointerEvent) {
      const fracX = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const fracY = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
      if (dragTextId) {
        updateTextLayer(dragTextId, { x: fracX, y: fracY });
      } else if (cropPanEnabled) {
        updateState({ panOffset: panAxisIsX ? fracX : fracY });
      }
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  async function handleDone() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    setIsExporting(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Export failed.");
      const file = new File([blob], "revv-photo.jpg", { type: "image/jpeg" });
      onExported(file);
    } catch {
      setError("Couldn't finish editing that photo. Try again.");
    } finally {
      setIsExporting(false);
    }
  }

  const selectedLayer = state.textLayers.find((l) => l.id === selectedTextId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element -- source decode element, not a display asset */}
      <img ref={imgRef} src={sourceUrl} alt="" className="sr-only" />

      <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleDone}
          disabled={!ready || isExporting}
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {isExporting ? (
            "Saving…"
          ) : (
            <>
              <CheckIcon className="h-4 w-4" />
              Done
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="px-4 pt-3">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-3">
        <div
          ref={previewRef}
          onPointerDown={handlePreviewPointerDown}
          className="relative max-h-full max-w-full touch-none overflow-hidden rounded-2xl bg-black shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]"
          style={{ aspectRatio: `${canvasSize.width} / ${canvasSize.height}` }}
        >
          <canvas ref={canvasRef} className="h-full w-full" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
              Loading…
            </div>
          )}
          {tool === "text" &&
            state.textLayers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTextId(layer.id);
                }}
                className={`absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                  selectedTextId === layer.id ? "border-accent" : "border-transparent"
                }`}
                style={{ left: `${layer.x * 100}%`, top: `${layer.y * 100}%` }}
                aria-label={`Select "${layer.text}"`}
              />
            ))}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-white/10 bg-[#0a0a0b] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {tool === "crop" && (
          <div className="flex items-center justify-center gap-2 py-4">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => updateState({ aspect: a.id, panOffset: 0.5 })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  state.aspect === a.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-white/10 text-white/80"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {tool === "filter" && (
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 py-4">
            {FILTER_PRESETS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => updateState({ filterId: f.id })}
                className="flex flex-shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={`h-14 w-14 rounded-xl bg-gradient-to-br from-zinc-500 to-zinc-800 ${
                    state.filterId === f.id ? "ring-2 ring-accent ring-offset-2 ring-offset-black" : ""
                  }`}
                  style={{ filter: f.css }}
                />
                <span className="text-xs text-white/80">{f.label}</span>
              </button>
            ))}
          </div>
        )}

        {tool === "text" && (
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex gap-2">
              <input
                value={newTextDraft}
                onChange={(e) => setNewTextDraft(e.target.value)}
                placeholder="Add text…"
                maxLength={80}
                className="glass-inset min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/40"
              />
              <button
                type="button"
                onClick={addTextLayer}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
                aria-label="Add text layer"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>

            {selectedLayer && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3">
                <div className="flex items-center gap-2">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateTextLayer(selectedLayer.id, { color: c })}
                      className={`h-6 w-6 rounded-full border-2 ${
                        selectedLayer.color === c ? "border-accent" : "border-white/20"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Text color ${c}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => removeTextLayer(selectedLayer.id)}
                  aria-label="Delete text"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            )}
            {!selectedLayer && state.textLayers.length > 0 && (
              <p className="text-center text-xs text-muted">
                Tap a dot on the preview to drag or restyle it.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-around px-2 py-2">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool((t) => (t === id ? null : id))}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 ${
                tool === id ? "text-accent" : "text-white/70"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[0.65rem] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
