"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { drawFrame } from "@/features/editor/draw-frame";
import { capturePreviewSource } from "@/features/editor/capture-preview-source";
import { aspectNeedsPan } from "@/features/editor/crop";
import {
  type AspectRatioId,
  type Rotation,
  type TextLayer,
  type DrawStroke,
  type TextFontId,
} from "@/features/editor/types";
import {
  CropIcon,
  TextToolIcon,
  FilterIcon,
  StickerIcon,
  BrushIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";
import {
  StudioHeader,
  StudioAction,
  StudioStage,
  StudioDeck,
  StudioPanel,
  StudioRail,
} from "@/features/editor/studio-ui";
import {
  LayerHandles,
  TextComposer,
  StickerSheet,
  StickerControls,
  CropControls,
  FilterControls,
  DrawControls,
  TEXT_COLORS,
  DRAW_WIDTHS,
} from "@/features/editor/editor-tools";

type Tool = "crop" | "filter" | "sticker" | "draw" | null;
type RailTool = "text" | "stickers" | "filter" | "draw" | "crop";

const ROTATION_STEPS: Rotation[] = [0, 90, 180, 270];

const TOOL_TITLES: Record<Exclude<Tool, null>, string> = {
  crop: "Crop",
  filter: "Filters",
  sticker: "Sticker",
  draw: "Draw",
};

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
  const [textComposer, setTextComposer] = useState<{ layerId: string | null } | null>(null);
  const [stickerSheetOpen, setStickerSheetOpen] = useState(false);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [drawColor, setDrawColor] = useState(TEXT_COLORS[2]);
  const [drawWidth, setDrawWidth] = useState(DRAW_WIDTHS[1]);
  const [filterPreviewSource, setFilterPreviewSource] = useState<ImageData | null>(null);
  const hasCapturedFilterPreviewRef = useRef(false);
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
    // Captured once, from this canvas's first real drawn frame rather
    // than directly from the source <img> — see capture-preview-source.ts
    // for why (matches the same fix applied in video-editor.tsx, even
    // though an already-loaded <img> is less prone to the "no frame
    // decoded yet" issue a <video> has — capturing from the canvas is
    // still the more honest source of truth for what's actually on
    // screen, crop/rotation included).
    if (!hasCapturedFilterPreviewRef.current) {
      hasCapturedFilterPreviewRef.current = true;
      setFilterPreviewSource(capturePreviewSource(canvas));
    }
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

  function commitText(value: { text: string; color: string; fontId: TextFontId; fontSize: number }) {
    const editingId = textComposer?.layerId ?? null;
    if (editingId) {
      updateTextLayer(editingId, value);
    } else {
      const layer: TextLayer = {
        id: crypto.randomUUID(),
        x: 0.5,
        y: 0.42,
        isSticker: false,
        ...value,
      };
      setState((s) => ({ ...s, textLayers: [...s.textLayers, layer] }));
    }
    setTextComposer(null);
    setSelectedTextId(null);
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
    setStickerSheetOpen(false);
    setTool("sticker");
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

    // Text and stickers are dragged by their own handles (LayerHandles);
    // a press on the bare picture just lets go of whatever was selected.
    const cropPanEnabled =
      tool === "crop" && aspectNeedsPan(state.aspect, imgDims.width, imgDims.height, state.rotation);
    if (!cropPanEnabled) {
      if (tool === "sticker" || tool === null) {
        setSelectedTextId(null);
        if (tool === "sticker") setTool(null);
      }
      return;
    }

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
      updateState({ panOffset: panAxisIsX ? fracX : fracY });
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
      const file = new File([blob], "sorza-photo.jpg", { type: "image/jpeg" });
      onExported(file);
    } catch {
      setError("Couldn't finish editing that photo. Try again.");
    } finally {
      setIsExporting(false);
    }
  }

  const selectedLayer = state.textLayers.find((l) => l.id === selectedTextId) ?? null;
  const editingLayer = textComposer?.layerId
    ? (state.textLayers.find((l) => l.id === textComposer.layerId) ?? null)
    : null;

  const railTools: { id: RailTool; label: string; icon: typeof CropIcon; badge?: boolean }[] = [
    { id: "text", label: "Text", icon: TextToolIcon, badge: state.textLayers.some((l) => !l.isSticker) },
    { id: "stickers", label: "Stickers", icon: StickerIcon, badge: state.textLayers.some((l) => l.isSticker) },
    { id: "filter", label: "Filters", icon: FilterIcon, badge: state.filterId !== "original" },
    { id: "draw", label: "Draw", icon: BrushIcon, badge: state.drawStrokes.length > 0 },
    { id: "crop", label: "Crop", icon: CropIcon, badge: state.aspect !== "original" || state.rotation !== 0 },
  ];

  function selectRailTool(id: RailTool) {
    setSelectedTextId(null);
    if (id === "text") {
      setTool(null);
      setTextComposer({ layerId: null });
    } else if (id === "stickers") {
      setTool(null);
      setStickerSheetOpen(true);
    } else {
      setTool((t) => (t === id ? null : id));
    }
  }

  function handleLayerTap(layer: TextLayer) {
    if (layer.isSticker) {
      setSelectedTextId(layer.id);
      setTool("sticker");
    } else {
      setTool(null);
      setTextComposer({ layerId: layer.id });
    }
  }

  return (
    <div data-no-edge-swipe className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element -- source decode element, not a display asset */}
      <img ref={imgRef} src={sourceUrl} alt="" className="sr-only" />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <StudioStage ratio={canvasSize.width / canvasSize.height}>
          <div
            ref={previewRef}
            onPointerDown={handlePreviewPointerDown}
            className="relative h-full w-full touch-none overflow-hidden rounded-[22px] bg-[#111113]"
          >
            <canvas ref={canvasRef} className="h-full w-full" />
            {!ready && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/55">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
                <span className="text-[0.8125rem] font-medium">Loading photo</span>
              </div>
            )}
            <LayerHandles
              layers={state.textLayers}
              selectedId={selectedTextId}
              previewRef={previewRef}
              interactive={tool === null || tool === "sticker"}
              onMove={(id, x, y) => updateTextLayer(id, { x, y })}
              onTap={handleLayerTap}
              onDelete={(id) => {
                removeTextLayer(id);
                if (tool === "sticker") setTool(null);
              }}
              onDragStateChange={setIsDraggingLayer}
            />
          </div>
        </StudioStage>

        <StudioHeader onBack={onCancel} backLabel="Back to camera" />

        <StudioRail
          tools={railTools}
          active={tool === "filter" || tool === "draw" || tool === "crop" ? tool : null}
          onSelect={selectRailTool}
          hidden={tool !== null || isDraggingLayer}
        />

        {error && (
          <div className="animate-rise-in absolute inset-x-3 top-[calc(4.25rem+env(safe-area-inset-top))] z-30">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
      </div>

      <StudioDeck>
        {tool === "crop" && (
          <StudioPanel title={TOOL_TITLES.crop} onDone={() => setTool(null)}>
            <CropControls
              aspect={state.aspect}
              onAspect={(aspect) => updateState({ aspect, panOffset: 0.5 })}
              onRotate={rotateClockwise}
              canPan={aspectNeedsPan(state.aspect, imgDims.width, imgDims.height, state.rotation)}
            />
          </StudioPanel>
        )}

        {tool === "filter" && (
          <StudioPanel title={TOOL_TITLES.filter} onDone={() => setTool(null)}>
            <FilterControls
              filterId={state.filterId}
              intensity={state.filterIntensity}
              previewSource={filterPreviewSource}
              onFilter={(filterId) => updateState({ filterId, filterIntensity: 1 })}
              onIntensity={(filterIntensity) => updateState({ filterIntensity })}
            />
          </StudioPanel>
        )}

        {tool === "draw" && (
          <StudioPanel title={TOOL_TITLES.draw} onDone={() => setTool(null)}>
            <DrawControls
              color={drawColor}
              width={drawWidth}
              canUndo={state.drawStrokes.length > 0}
              onColor={setDrawColor}
              onWidth={setDrawWidth}
              onUndo={undoDrawStroke}
              onClear={clearDrawStrokes}
            />
          </StudioPanel>
        )}

        {tool === "sticker" && selectedLayer?.isSticker && (
          <StudioPanel title={TOOL_TITLES.sticker} onDone={() => {
            setSelectedTextId(null);
            setTool(null);
          }}>
            <StickerControls
              layer={selectedLayer}
              onResize={(fontSize) => updateTextLayer(selectedLayer.id, { fontSize })}
              onDelete={() => {
                removeTextLayer(selectedLayer.id);
                setTool(null);
              }}
            />
          </StudioPanel>
        )}

        {(tool === null || (tool === "sticker" && !selectedLayer?.isSticker)) && (
          <div className="px-4">
            <StudioAction onClick={handleDone} disabled={!ready || isExporting} busy={isExporting}>
              {isExporting ? (
                "Saving…"
              ) : (
                <>
                  Next
                  <ChevronRightIcon className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </>
              )}
            </StudioAction>
          </div>
        )}
      </StudioDeck>

      {textComposer && (
        <TextComposer
          initial={
            editingLayer
              ? {
                  text: editingLayer.text,
                  color: editingLayer.color,
                  fontId: editingLayer.fontId,
                  fontSize: editingLayer.fontSize,
                }
              : null
          }
          onDone={commitText}
          onCancel={() => setTextComposer(null)}
          onDelete={
            editingLayer
              ? () => {
                  removeTextLayer(editingLayer.id);
                  setTextComposer(null);
                }
              : undefined
          }
        />
      )}

      {stickerSheetOpen && (
        <StickerSheet onPick={addStickerLayer} onClose={() => setStickerSheetOpen(false)} />
      )}
    </div>
  );
}
