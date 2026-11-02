"use client";

import { useEffect, useRef, useState } from "react";
import { FILTER_PRESETS, FILTER_CATEGORIES, type FilterCategoryId } from "@/features/editor/filters";
import { FilterSwatch } from "@/features/editor/filter-swatch";
import { STICKER_EMOJIS } from "@/features/editor/stickers";
import { TEXT_FONTS, type AspectRatioId, type TextFontId, type TextLayer } from "@/features/editor/types";
import { RotateIcon, TrashIcon } from "@/components/ui/icons";
import {
  StudioChip,
  StudioIconButton,
  StudioSheet,
  StudioSlider,
  StudioSwatches,
} from "@/features/editor/studio-ui";

/** Tools both editors share — the photo editor is the video editor minus
 * time, so every panel that doesn't touch time lives here once instead of
 * twice. */

export const TEXT_COLORS = ["#ffffff", "#000000", "#ff4433", "#ffd166", "#06d6a0", "#4cc9f0", "#bf5af2"];
export const DRAW_WIDTHS = [6, 12, 22];

export const ASPECTS: { id: AspectRatioId; label: string }[] = [
  { id: "9:16", label: "9:16" },
  { id: "4:5", label: "4:5" },
  { id: "1:1", label: "1:1" },
  { id: "original", label: "Original" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function fontStack(fontId: TextFontId): string {
  return TEXT_FONTS.find((f) => f.id === fontId)?.stack ?? TEXT_FONTS[0].stack;
}

let measureCtx: CanvasRenderingContext2D | null = null;
/** Measures a layer exactly the way draw-frame.ts draws it (same weight,
 * same stack, same 1080-relative size), so the drag handle traces the
 * real text rather than a guess at it. */
function measureLayer(layer: TextLayer, previewWidth: number): { width: number; height: number } {
  const px = layer.fontSize * (previewWidth / 1080);
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return { width: px * layer.text.length * 0.6, height: px * 1.2 };
  measureCtx.font = `700 ${px}px ${fontStack(layer.fontId)}`;
  return { width: measureCtx.measureText(layer.text).width, height: px * 1.15 };
}

/** Touch targets laid over the preview, one per text/sticker layer. Drag
 * one to move it; drag it onto the bin that appears at the bottom to
 * delete it; tap it to edit it. The layers themselves are still drawn by
 * the canvas — these only trace them. */
export function LayerHandles({
  layers,
  selectedId,
  previewRef,
  interactive,
  onMove,
  onTap,
  onDelete,
  onDragStateChange,
}: {
  layers: TextLayer[];
  selectedId: string | null;
  previewRef: React.RefObject<HTMLDivElement | null>;
  interactive: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onTap: (layer: TextLayer) => void;
  onDelete: (id: string) => void;
  /** Lets the editor hide its other chrome while something is being
   * dragged, so the bin is the only thing on screen asking for attention. */
  onDragStateChange?: (dragging: boolean) => void;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overTrash, setOverTrash] = useState(false);
  const trashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setBox({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [previewRef]);

  function startDrag(layer: TextLayer, e: React.PointerEvent<HTMLButtonElement>) {
    const el = previewRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, lx: layer.x, ly: layer.y };
    let moved = false;
    let isOverTrash = false;

    function move(ev: PointerEvent) {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) {
        moved = true;
        setDraggingId(layer.id);
        onDragStateChange?.(true);
      }
      onMove(
        layer.id,
        clamp(start.lx + dx / rect.width, 0.02, 0.98),
        clamp(start.ly + dy / rect.height, 0.02, 0.98),
      );
      const trash = trashRef.current?.getBoundingClientRect();
      const nextOver =
        !!trash &&
        ev.clientX >= trash.left - 16 &&
        ev.clientX <= trash.right + 16 &&
        ev.clientY >= trash.top - 16 &&
        ev.clientY <= trash.bottom + 16;
      if (nextOver !== isOverTrash) {
        isOverTrash = nextOver;
        setOverTrash(nextOver);
        if (nextOver) navigator.vibrate?.(10);
      }
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (!moved) {
        onTap(layer);
        return;
      }
      if (isOverTrash) onDelete(layer.id);
      setDraggingId(null);
      setOverTrash(false);
      onDragStateChange?.(false);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  if (!box.width) return null;

  return (
    <>
      {layers.map((layer) => {
        const size = measureLayer(layer, box.width);
        const isSelected = selectedId === layer.id || draggingId === layer.id;
        return (
          <button
            key={layer.id}
            type="button"
            onPointerDown={(e) => startDrag(layer, e)}
            aria-label={layer.isSticker ? "Move sticker" : `Move or edit "${layer.text}"`}
            className={`absolute touch-none rounded-[10px] transition-[border-color,opacity] duration-150 ${
              interactive ? "" : "pointer-events-none"
            } ${isSelected ? "border-2 border-dashed border-white/85" : "border-2 border-transparent"} ${
              draggingId === layer.id && overTrash ? "opacity-40" : ""
            }`}
            style={{
              left: `${layer.x * 100}%`,
              top: `${layer.y * 100}%`,
              width: Math.max(44, size.width + 20),
              height: Math.max(44, size.height + 14),
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
      <div
        ref={trashRef}
        aria-hidden
        className={`pointer-events-none absolute bottom-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full transition-all duration-200 ease-[var(--ease-ios)] ${
          draggingId ? "opacity-100" : "opacity-0"
        } ${overTrash ? "scale-125 bg-accent text-white" : "bg-black/50 text-white backdrop-blur-xl"}`}
      >
        <TrashIcon className="h-6 w-6" />
      </div>
    </>
  );
}

/** Full-screen text entry, TikTok-style: the words appear big in the
 * middle of the screen in the chosen colour and typeface as they're
 * typed, with the style controls along the top where the keyboard can
 * never cover them. */
export function TextComposer({
  initial,
  onDone,
  onCancel,
  onDelete,
}: {
  initial: { text: string; color: string; fontId: TextFontId; fontSize: number } | null;
  onDone: (value: { text: string; color: string; fontId: TextFontId; fontSize: number }) => void;
  onCancel: () => void;
  /** Present when editing an existing layer. */
  onDelete?: () => void;
}) {
  const [text, setText] = useState(initial?.text ?? "");
  const [color, setColor] = useState(initial?.color ?? TEXT_COLORS[0]);
  const [fontId, setFontId] = useState<TextFontId>(initial?.fontId ?? "sans");
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? 72);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focused on the next frame, not via autoFocus: iOS only raises the
    // keyboard for a focus that happens after the element is laid out.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  function finish() {
    const trimmed = text.trim();
    if (!trimmed) {
      if (onDelete) onDelete();
      else onCancel();
      return;
    }
    onDone({ text: trimmed.slice(0, 80), color, fontId, fontSize });
  }

  // A white word gets a dark outline in the export (draw-frame.ts); the
  // preview here mirrors it so the type looks the way it will land.
  const outline = color === "#000000" ? "rgb(255 255 255 / 0.5)" : "rgb(0 0 0 / 0.55)";

  return (
    <div className="animate-fade-in fixed inset-0 z-[75] flex flex-col bg-black/75 backdrop-blur-md">
      <div className="flex items-center justify-between px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onCancel}
          className="pressable h-10 rounded-full px-3 text-[0.9375rem] font-medium text-white/80"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          {onDelete && (
            <StudioIconButton onClick={onDelete} label="Delete text" tone="danger">
              <TrashIcon className="h-4 w-4" />
            </StudioIconButton>
          )}
          <button
            type="button"
            onClick={finish}
            className="pressable h-10 rounded-full bg-white px-5 text-[0.9375rem] font-semibold text-black"
          >
            Done
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 px-4">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {TEXT_FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFontId(f.id)}
              aria-pressed={fontId === f.id}
              style={{ fontFamily: f.stack }}
              className={`pressable flex-shrink-0 rounded-full px-4 py-1.5 text-[0.875rem] font-bold transition-colors ${
                fontId === f.id ? "bg-white text-black" : "bg-white/[0.1] text-white/85"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <StudioSwatches colors={TEXT_COLORS} value={color} onChange={setColor} label="Text colour" />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-5">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              finish();
            }
          }}
          maxLength={80}
          enterKeyHint="done"
          placeholder="Type something"
          aria-label="Text"
          className="w-full bg-transparent text-center font-bold text-white placeholder:text-white/35 focus:outline-none"
          style={{
            fontFamily: fontStack(fontId),
            color,
            fontSize: `${clamp(fontSize * 0.52, 22, 76)}px`,
            WebkitTextStroke: `${Math.max(0.5, fontSize * 0.012)}px ${outline}`,
            paintOrder: "stroke fill",
          }}
        />
      </div>

      <div className="px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <StudioSlider
          label="Size"
          value={fontSize}
          min={28}
          max={160}
          step={2}
          onChange={setFontSize}
        />
      </div>
    </div>
  );
}

export function StickerSheet({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <StudioSheet title="Stickers" onClose={onClose}>
      <div className="grid grid-cols-6 gap-1 pb-2">
        {STICKER_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            className="pressable flex aspect-square items-center justify-center rounded-[14px] text-[2rem] active:bg-white/10"
            aria-label={`Add ${emoji} sticker`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </StudioSheet>
  );
}

/** Shown in the deck while a sticker is selected: how big, or gone. */
export function StickerControls({
  layer,
  onResize,
  onDelete,
}: {
  layer: TextLayer;
  onResize: (fontSize: number) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-end gap-4 px-4 pb-1 pt-2">
      <div className="min-w-0 flex-1">
        <StudioSlider
          label="Size"
          value={layer.fontSize}
          min={40}
          max={260}
          step={4}
          onChange={onResize}
        />
      </div>
      <StudioIconButton onClick={onDelete} label="Delete sticker" tone="danger">
        <TrashIcon className="h-4 w-4" />
      </StudioIconButton>
    </div>
  );
}

export function CropControls({
  aspect,
  onAspect,
  onRotate,
  canPan,
}: {
  aspect: AspectRatioId;
  onAspect: (aspect: AspectRatioId) => void;
  onRotate: () => void;
  canPan: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 pb-1 pt-2">
      <div className="flex items-center justify-center gap-2">
        {ASPECTS.map((a) => (
          <StudioChip key={a.id} active={aspect === a.id} onClick={() => onAspect(a.id)}>
            {a.label}
          </StudioChip>
        ))}
        <StudioIconButton onClick={onRotate} label="Rotate 90 degrees">
          <RotateIcon className="h-4 w-4" />
        </StudioIconButton>
      </div>
      <p className="h-4 text-center text-[0.75rem] text-white/45">
        {canPan ? "Drag the picture to reframe it" : ""}
      </p>
    </div>
  );
}

export function FilterControls({
  filterId,
  intensity,
  previewSource,
  onFilter,
  onIntensity,
}: {
  filterId: string;
  intensity: number;
  previewSource: ImageData | null;
  onFilter: (id: string) => void;
  onIntensity: (value: number) => void;
}) {
  const [category, setCategory] = useState<FilterCategoryId>(FILTER_CATEGORIES[0].id);
  return (
    <div className="flex flex-col gap-3 pb-1 pt-2">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
        {FILTER_CATEGORIES.map((c) => (
          <StudioChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
            {c.label}
          </StudioChip>
        ))}
      </div>
      <div className="no-scrollbar fade-edge-r flex gap-2.5 overflow-x-auto px-4">
        {FILTER_PRESETS.filter((f) => f.id === "original" || f.category === category).map((f) => (
          <FilterSwatch
            key={f.id}
            preset={f}
            previewSource={previewSource}
            selected={filterId === f.id}
            onClick={() => onFilter(f.id)}
          />
        ))}
      </div>
      {filterId !== "original" && (
        <div className="px-4">
          <StudioSlider
            label="Intensity"
            value={intensity}
            min={0}
            max={1}
            step={0.01}
            onChange={onIntensity}
            display={`${Math.round(intensity * 100)}%`}
          />
        </div>
      )}
    </div>
  );
}

export function DrawControls({
  color,
  width,
  canUndo,
  onColor,
  onWidth,
  onUndo,
  onClear,
}: {
  color: string;
  width: number;
  canUndo: boolean;
  onColor: (color: string) => void;
  onWidth: (width: number) => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-3.5 px-4 pb-1 pt-2">
      <StudioSwatches colors={TEXT_COLORS} value={color} onChange={onColor} label="Brush colour" />
      <div className="flex items-center gap-2.5">
        {DRAW_WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onWidth(w)}
            aria-label={`Brush size ${w}`}
            aria-pressed={width === w}
            className={`pressable flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              width === w ? "bg-white" : "bg-white/[0.08]"
            }`}
          >
            <span
              className="rounded-full"
              style={{
                width: Math.round(w / 1.6),
                height: Math.round(w / 1.6),
                backgroundColor: width === w ? "#000" : "#fff",
              }}
            />
          </button>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="pressable h-9 rounded-full bg-white/[0.08] px-4 text-[0.8125rem] font-semibold text-white disabled:opacity-35"
        >
          Undo
        </button>
        <StudioIconButton onClick={onClear} label="Clear drawing" disabled={!canUndo}>
          <TrashIcon className="h-4 w-4" />
        </StudioIconButton>
      </div>
    </div>
  );
}
