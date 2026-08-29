"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { drawFrame } from "@/features/editor/draw-frame";
import { FILTER_PRESETS, FILTER_CATEGORIES, type FilterCategoryId } from "@/features/editor/filters";
import { FilterSwatch } from "@/features/editor/filter-swatch";
import { capturePreviewSource } from "@/features/editor/capture-preview-source";
import { aspectNeedsPan } from "@/features/editor/crop";
import { STICKER_EMOJIS } from "@/features/editor/stickers";
import {
  TEXT_FONTS,
  type AspectRatioId,
  type Rotation,
  type TextLayer,
  type DrawStroke,
} from "@/features/editor/types";
import {
  BackIcon,
  CheckIcon,
  CropIcon,
  TextToolIcon,
  FilterIcon,
  TrashIcon,
  PlusIcon,
  StickerIcon,
  RotateIcon,
  BrushIcon,
} from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";

type Tool = "crop" | "filter" | "text" | "sticker" | "draw" | null;

const ASPECTS: { id: AspectRatioId; label: string }[] = [
  { id: "9:16", label: "9:16" },
  { id: "4:5", label: "4:5" },
  { id: "1:1", label: "1:1" },
  { id: "original", label: "Original" },
];

const TEXT_COLORS = ["#ffffff", "#ff4433", "#ffd166", "#06d6a0", "#4cc9f0", "#000000"];
const DRAW_WIDTHS = [6, 12, 22];
const ROTATION_STEPS: Rotation[] = [0, 90, 180, 270];

const TOOLS: { id: Exclude<Tool, null>; label: string; icon: typeof CropIcon }[] = [
  { id: "crop", label: "Crop", icon: CropIcon },
  { id: "filter", label: "Filters", icon: FilterIcon },
  { id: "text", label: "Text", icon: TextToolIcon },
  { id: "sticker", label: "Stickers", icon: StickerIcon },
  { id: "draw", label: "Draw", icon: BrushIcon },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface PhotoEditState {
  aspect: AspectRatioId;
  panOffset: number;
  rotation: Rotation;
  filterId: string;
  filterIntensity: number;
  textLayers: TextLayer[];
  drawStrokes: DrawStroke[];
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
    rotation: 0,
    filterId: "original",
    filterIntensity: 1,
    textLayers: [],
    drawStrokes: [],
  });
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newTextDraft, setNewTextDraft] = useState("");
  const [drawColor, setDrawColor] = useState(TEXT_COLORS[1]);
  const [drawWidth, setDrawWidth] = useState(DRAW_WIDTHS[1]);
  const [filterCategory, setFilterCategory] = useState<FilterCategoryId>(FILTER_CATEGORIES[0].id);
  const [filterPreviewSource, setFilterPreviewSource] = useState<ImageData | null>(null);
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
      setFilterPreviewSource(capturePreviewSource(img!));
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

  function rotateClockwise() {
    setState((s) => {
      const currentIndex = ROTATION_STEPS.indexOf(s.rotation);
      const next = ROTATION_STEPS[(currentIndex + 1) % ROTATION_STEPS.length];
      return { ...s, rotation: next };
    });
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
      fontId: "sans",
      isSticker: false,
    };
    setState((s) => ({ ...s, textLayers: [...s.textLayers, layer] }));
    setNewTextDraft("");
    setSelectedTextId(layer.id);
  }

  function addStickerLayer(emoji: string) {
    const layer: TextLayer = {
      id: crypto.randomUUID(),
      text: emoji,
      x: 0.5,
      y: 0.5,
      color: "#ffffff",
      fontSize: 110,
      fontId: "sans",
      isSticker: true,
    };
    setState((s) => ({ ...s, textLayers: [...s.textLayers, layer] }));
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

  function addDrawStroke(strokeId: string, fracX: number, fracY: number) {
    setState((s) => {
      const point = { x: fracX, y: fracY };
      const existing = s.drawStrokes.find((st) => st.id === strokeId);
      const drawStrokes: DrawStroke[] = existing
        ? s.drawStrokes.map((st) =>
            st.id === strokeId ? { ...st, points: [...st.points, point] } : st,
          )
        : [...s.drawStrokes, { id: strokeId, color: drawColor, width: drawWidth, points: [point] }];
      return { ...s, drawStrokes };
    });
  }

  function undoDrawStroke() {
    setState((s) => ({ ...s, drawStrokes: s.drawStrokes.slice(0, -1) }));
  }

  function clearDrawStrokes() {
    setState((s) => ({ ...s, drawStrokes: [] }));
  }

  function handlePreviewPointerDown(e: React.PointerEvent) {
    const container = previewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (tool === "draw") {
      e.preventDefault();
      const strokeId = crypto.randomUUID();
      const point = (ev: { clientX: number; clientY: number }) => ({
        x: clamp((ev.clientX - rect.left) / rect.width, 0, 1),
        y: clamp((ev.clientY - rect.top) / rect.height, 0, 1),
      });
      const first = point(e);
      addDrawStroke(strokeId, first.x, first.y);
      function move(ev: PointerEvent) {
        const p = point(ev);
        addDrawStroke(strokeId, p.x, p.y);
      }
      function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      return;
    }

    const dragTextId = tool === "text" || tool === "sticker" ? selectedTextId : null;
    const cropPanEnabled =
      tool === "crop" && aspectNeedsPan(state.aspect, imgDims.width, imgDims.height, state.rotation);
    if (!dragTextId && !cropPanEnabled) return;

    e.preventDefault();
    const imgAspect = imgDims.width / Math.max(1, imgDims.height);
    const rawTargetAspect =
      state.aspect === "9:16"
        ? 9 / 16
        : state.aspect === "1:1"
          ? 1
          : state.aspect === "4:5"
            ? 4 / 5
            : imgAspect;
    const targetAspect =
      state.rotation === 90 || state.rotation === 270 ? 1 / rawTargetAspect : rawTargetAspect;
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
          {(tool === "text" || tool === "sticker") &&
            state.textLayers
              .filter((l) => l.isSticker === (tool === "sticker"))
              .map((layer) => (
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
            <button
              type="button"
              onClick={rotateClockwise}
              aria-label="Rotate 90 degrees"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80"
            >
              <RotateIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {tool === "filter" && (
          <div className="flex flex-col gap-3 py-4">
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
              {FILTER_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilterCategory(c.id)}
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    filterCategory === c.id ? "bg-accent text-accent-foreground" : "bg-white/10 text-white/70"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
              {FILTER_PRESETS.filter((f) => f.id === "original" || f.category === filterCategory).map((f) => (
                <FilterSwatch
                  key={f.id}
                  preset={f}
                  previewSource={filterPreviewSource}
                  selected={state.filterId === f.id}
                  onClick={() => updateState({ filterId: f.id, filterIntensity: 1 })}
                />
              ))}
            </div>

            {state.filterId !== "original" && (
              <div className="flex items-center gap-3 px-4">
                <span className="w-14 flex-shrink-0 text-xs text-white/60">
                  {Math.round(state.filterIntensity * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={state.filterIntensity}
                  onChange={(e) => updateState({ filterIntensity: Number(e.target.value) })}
                  className="flex-1"
                  aria-label="Filter intensity"
                />
              </div>
            )}
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

            {selectedLayer && !selectedLayer.isSticker && (
              <div className="flex flex-col gap-3 rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
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

                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/60">Size</span>
                  <input
                    type="range"
                    min={24}
                    max={160}
                    step={2}
                    value={selectedLayer.fontSize}
                    onChange={(e) =>
                      updateTextLayer(selectedLayer.id, { fontSize: Number(e.target.value) })
                    }
                    className="flex-1"
                  />
                </div>

                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {TEXT_FONTS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateTextLayer(selectedLayer.id, { fontId: f.id })}
                      className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-sm ${
                        selectedLayer.fontId === f.id
                          ? "border-accent bg-accent/15 text-white"
                          : "border-white/15 text-white/70"
                      }`}
                      style={{ fontFamily: f.stack }}
                    >
                      Aa
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!selectedLayer && state.textLayers.filter((l) => !l.isSticker).length > 0 && (
              <p className="text-center text-xs text-muted">
                Tap a dot on the preview to drag or restyle it.
              </p>
            )}
          </div>
        )}

        {tool === "sticker" && (
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="no-scrollbar grid grid-cols-8 gap-2 overflow-x-auto">
              {STICKER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addStickerLayer(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xl"
                  aria-label={`Add ${emoji} sticker`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {selectedLayer && selectedLayer.isSticker && (
              <div className="flex flex-col gap-3 rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-white/60">Selected: {selectedLayer.text}</span>
                  <button
                    type="button"
                    onClick={() => removeTextLayer(selectedLayer.id)}
                    aria-label="Delete sticker"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/60">Size</span>
                  <input
                    type="range"
                    min={40}
                    max={220}
                    step={4}
                    value={selectedLayer.fontSize}
                    onChange={(e) =>
                      updateTextLayer(selectedLayer.id, { fontSize: Number(e.target.value) })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            )}
            {!selectedLayer && state.textLayers.filter((l) => l.isSticker).length > 0 && (
              <p className="text-center text-xs text-muted">
                Tap a sticker on the preview to drag or resize it.
              </p>
            )}
          </div>
        )}

        {tool === "draw" && (
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDrawColor(c)}
                    className={`h-6 w-6 rounded-full border-2 ${
                      drawColor === c ? "border-accent" : "border-white/20"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Draw color ${c}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={undoDrawStroke}
                  disabled={state.drawStrokes.length === 0}
                  className="text-xs text-white/70 disabled:opacity-40"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={clearDrawStrokes}
                  disabled={state.drawStrokes.length === 0}
                  aria-label="Clear drawing"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 disabled:opacity-40"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {DRAW_WIDTHS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setDrawWidth(w)}
                  aria-label={`Brush size ${w}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    drawWidth === w ? "bg-accent" : "bg-white/10"
                  }`}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: Math.round(w / 2),
                      height: Math.round(w / 2),
                      backgroundColor: drawWidth === w ? "var(--color-accent-foreground)" : "white",
                    }}
                  />
                </button>
              ))}
              <span className="text-xs text-white/50">Draw right on the preview</span>
            </div>
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
