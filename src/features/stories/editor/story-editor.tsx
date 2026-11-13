"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { StoryFrame, fitStoryFrame, useBoxSize } from "@/features/stories/story-frame";
import { TextEditorOverlay, type TextDraft } from "@/features/stories/editor/text-editor";
import { StickerSheet, type StickerPick } from "@/features/stories/editor/sticker-sheet";
import { ColorRow, ToolButton, VerticalSlider } from "@/features/stories/editor/controls";
import { Avatar } from "@/features/feed/avatar";
import { SoundPickerSheet } from "@/features/sounds/sound-picker-sheet";
import { SoundTrimSheet } from "@/features/sounds/sound-trim-sheet";
import { publicSoundUrl, type Sound } from "@/lib/db/sounds";
import { createClient } from "@/lib/supabase/client";
import { SOUND_CLIP_MS } from "@/lib/validation/sound";
import {
  DEFAULT_DESIGN,
  STICKER_STYLES,
  STORY_FILTERS,
  STORY_FILTER_CSS,
  STORY_FILTER_LABELS,
  isPlainDesign,
  type StoryDesign,
  type StoryLayer,
  type Stroke,
  type StrokeTool,
} from "@/lib/stories/design";
import { rankForScore } from "@/lib/rating/rank";
import { hapticSnap } from "@/lib/haptics";
import {
  ChevronRightIcon,
  CloseIcon,
  EraserIcon,
  MarkerToolIcon,
  NeonToolIcon,
  PenToolIcon,
  StickerPeelIcon,
  TextToolIcon,
  TrashIcon,
  UndoIcon,
  WandIcon,
  BrushIcon,
} from "@/components/ui/icons";

export interface EditorMedia {
  url: string;
  kind: "image" | "video";
}

type Mode = "idle" | "text" | "draw" | "stickers" | "filters" | "music";

interface Gesture {
  target: string;
  base: { x: number; y: number; scale: number; rotation: number };
  p0: { x: number; y: number }[];
  t0: number;
  moved: boolean;
  dx: number;
  dy: number;
}

const SNAP = 0.015;
const TRASH_RADIUS = 46;
let layerSeq = 0;
const newId = () => `l${Date.now().toString(36)}${(layerSeq++).toString(36)}`;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(b.y - a.y, b.x - a.x);
const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const TOOLS: { tool: StrokeTool; label: string; Icon: typeof PenToolIcon }[] = [
  { tool: "pen", label: "Pen", Icon: PenToolIcon },
  { tool: "marker", label: "Marker", Icon: MarkerToolIcon },
  { tool: "neon", label: "Neon", Icon: NeonToolIcon },
  { tool: "eraser", label: "Eraser", Icon: EraserIcon },
];

const subscribeNever = () => () => {};

/**
 * The story editor: the photo or video in a 9:16 frame, with text, drawing,
 * stickers and filters on top.
 *
 * - Drag anything to move it, pinch to resize, twist to rotate. It snaps to
 *   the center lines, and dropping it on the bin deletes it.
 * - Two fingers on the photo itself zoom, move and rotate it; a one-finger
 *   swipe across it changes the filter.
 * - Tap empty space to type; tap text to edit it; tap a sticker to change
 *   its style.
 */
export function StoryEditor({
  media,
  me,
  sharing,
  error,
  onCancel,
  onShare,
}: {
  media: EditorMedia;
  me: { username: string; avatarUrl: string | null };
  /** The share button's progress label while uploading, else null. */
  sharing: string | null;
  error: string | null;
  onCancel: () => void;
  onShare: (design: StoryDesign) => void;
}) {
  const [design, setDesignState] = useState<StoryDesign>(DEFAULT_DESIGN);
  const designRef = useRef(design);
  const setDesign = (next: StoryDesign | ((d: StoryDesign) => StoryDesign)) => {
    const value = typeof next === "function" ? next(designRef.current) : next;
    designRef.current = value;
    setDesignState(value);
  };

  // Portalled, so only once there's a document to portal into.
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [mode, setMode] = useState<Mode>("idle");
  const [draft, setDraft] = useState<TextDraft>({ id: null, text: "", font: "modern", color: "#ffffff", bg: "none", align: "center", scale: 1 });
  const [drag, setDrag] = useState<{ id: string; overTrash: boolean } | null>(null);
  const [guides, setGuides] = useState({ v: false, h: false });
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pen, setPen] = useState<{ tool: StrokeTool; color: string; width: number }>({ tool: "pen", color: "#ffffff", width: 0.014 });
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
  // Music: the picked song waiting for its start point, and the preview
  // that loops it while you edit.
  const [trimming, setTrimming] = useState<Sound | null>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const [musicPreview, setMusicPreview] = useState<{ url: string; startMs: number } | null>(null);

  const textRef = useRef<HTMLTextAreaElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const toastTimer = useRef(0);
  const [boxRef, box] = useBoxSize<HTMLDivElement>();
  const frame = fitStoryFrame(box.w - 0, box.h - 6);

  // No page scroll behind the editor.
  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, []);

  function flash(text: string) {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 900);
  }

  // ---- Text -------------------------------------------------------------

  function openText(layer: Extract<StoryLayer, { kind: "text" }> | null) {
    // Focused right here, inside the tap: iOS only raises the keyboard for
    // a focus() made during the gesture itself.
    textRef.current?.focus();
    setDraft(
      layer
        ? { id: layer.id, text: layer.text, font: layer.font, color: layer.color, bg: layer.bg, align: layer.align, scale: layer.scale }
        : { id: null, text: "", font: draft.font, color: draft.color, bg: draft.bg, align: "center", scale: 1 },
    );
    setMode("text");
  }

  function finishText() {
    textRef.current?.blur();
    const text = draft.text.trim();
    setDesign((d) => {
      if (draft.id) {
        if (!text) return { ...d, layers: d.layers.filter((l) => l.id !== draft.id) };
        return {
          ...d,
          layers: d.layers.map((l) =>
            l.id === draft.id && l.kind === "text"
              ? { ...l, text, font: draft.font, color: draft.color, bg: draft.bg, align: draft.align, scale: draft.scale }
              : l,
          ),
        };
      }
      if (!text) return d;
      return {
        ...d,
        layers: [
          ...d.layers,
          { kind: "text", id: newId(), x: 0.5, y: 0.42, scale: draft.scale, rotation: 0, text, font: draft.font, color: draft.color, bg: draft.bg, align: draft.align },
        ],
      };
    });
    setMode("idle");
  }

  // ---- Stickers ---------------------------------------------------------

  function addSticker(pick: StickerPick) {
    if (pick.kind === "music") {
      setMode("music");
      return;
    }
    const at = { id: newId(), x: 0.5, y: 0.5, scale: 1, rotation: 0 };
    const layer: StoryLayer =
      pick.kind === "mention"
        ? { kind: "mention", ...at, style: 0, username: pick.username, userId: null }
        : pick.kind === "car"
          ? { kind: "car", ...at, style: 0, vehicleId: pick.car.id, name: pick.car.name, score: pick.car.score, tier: pick.car.score == null ? null : rankForScore(pick.car.score) }
          : pick.kind === "location"
            ? { kind: "location", ...at, style: 0, name: pick.name }
            : pick.kind === "poll"
              ? { kind: "poll", ...at, y: 0.55, question: pick.question, options: pick.options }
              : pick.kind === "question"
                ? { kind: "question", ...at, y: 0.55, prompt: pick.prompt }
                : { kind: "time", ...at, style: 0, label: pick.label };
    setDesign((d) => ({ ...d, layers: [...d.layers, layer] }));
    setMode("idle");
  }

  function addMusic(sound: Sound, startMs: number) {
    setTrimming(null);
    setMode("idle");
    setDesign((d) => ({
      ...d,
      layers: [
        ...d.layers.filter((l) => l.kind !== "music"),
        { kind: "music", id: newId(), x: 0.5, y: 0.78, scale: 1, rotation: 0, style: 0, soundId: sound.id, startMs, title: sound.title, artist: sound.artist_name ?? "" },
      ],
    }));
    const url = publicSoundUrl(createClient(), sound.storage_path);
    setMusicPreview({ url, startMs });
    // Started inside the tap that confirmed it, so it's allowed to play.
    const audio = musicRef.current;
    if (audio) {
      audio.src = url;
      audio.currentTime = startMs / 1000;
      audio.play().catch(() => {});
    }
  }

  // ---- Moving things ----------------------------------------------------

  function valuesOf(target: string) {
    const d = designRef.current;
    if (target === "media") return { ...d.media };
    const l = d.layers.find((x) => x.id === target);
    return l ? { x: l.x, y: l.y, scale: l.scale, rotation: l.rotation } : null;
  }

  function apply(target: string, v: { x: number; y: number; scale: number; rotation: number }) {
    if (target === "media") {
      setDesign((d) => ({
        ...d,
        media: {
          x: Math.min(1, Math.max(-1, v.x)),
          y: Math.min(1, Math.max(-1, v.y)),
          scale: Math.min(5, Math.max(0.3, v.scale)),
          rotation: v.rotation,
        },
      }));
    } else {
      setDesign((d) => ({
        ...d,
        layers: d.layers.map((l) =>
          l.id === target
            ? { ...l, x: Math.min(1, Math.max(0, v.x)), y: Math.min(1, Math.max(0, v.y)), scale: Math.min(4, Math.max(0.2, v.scale)), rotation: v.rotation }
            : l,
        ),
      }));
    }
  }

  function rebase() {
    const g = gesture.current;
    if (!g) return;
    const v = valuesOf(g.target);
    if (!v) return;
    g.base = v;
    g.p0 = [...pointers.current.values()];
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (mode !== "idle") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      const id = (e.target as HTMLElement).closest<HTMLElement>("[data-layer-id]")?.dataset.layerId ?? "media";
      if (id !== "media") {
        // Whatever you touch comes to the front.
        setDesign((d) => {
          const l = d.layers.find((x) => x.id === id);
          return l ? { ...d, layers: [...d.layers.filter((x) => x.id !== id), l] } : d;
        });
      }
      const base = valuesOf(id);
      if (!base) return;
      gesture.current = { target: id, base, p0: [{ x: e.clientX, y: e.clientY }], t0: performance.now(), moved: false, dx: 0, dy: 0 };
    } else {
      rebase();
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g || frame.width === 0) return;
    const pts = [...pointers.current.values()];

    if (pts.length >= 2 && g.p0.length >= 2) {
      g.moved = true;
      const [a0, b0] = g.p0;
      const [a1, b1] = pts;
      const m0 = mid(a0, b0);
      const m1 = mid(a1, b1);
      apply(g.target, {
        x: g.base.x + (m1.x - m0.x) / frame.width,
        y: g.base.y + (m1.y - m0.y) / frame.height,
        scale: g.base.scale * (dist(a1, b1) / Math.max(1, dist(a0, b0))),
        rotation: g.base.rotation + angle(a1, b1) - angle(a0, b0),
      });
      return;
    }

    g.dx = pts[0].x - g.p0[0].x;
    g.dy = pts[0].y - g.p0[0].y;
    if (Math.abs(g.dx) + Math.abs(g.dy) > 6) g.moved = true;
    if (g.target === "media" || !g.moved) return;

    let x = g.base.x + g.dx / frame.width;
    let y = g.base.y + g.dy / frame.height;
    const v = Math.abs(x - 0.5) < SNAP;
    const h = Math.abs(y - 0.5) < SNAP;
    if (v) x = 0.5;
    if (h) y = 0.5;
    if ((v && !guides.v) || (h && !guides.h)) hapticSnap();
    if (v !== guides.v || h !== guides.h) setGuides({ v, h });

    const r = frameRef.current?.getBoundingClientRect();
    const overTrash = r ? Math.hypot(pts[0].x - (r.left + r.width / 2), pts[0].y - (r.bottom - 56)) < TRASH_RADIUS : false;
    if (overTrash && !drag?.overTrash) hapticSnap();
    if (!drag || drag.overTrash !== overTrash || drag.id !== g.target) setDrag({ id: g.target, overTrash });
    apply(g.target, { ...g.base, x, y });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (!g) return;
    if (pointers.current.size > 0) {
      // One finger lifted mid-pinch: carry on with the other from here.
      rebase();
      return;
    }
    gesture.current = null;
    const tap = !g.moved && performance.now() - g.t0 < 320;
    const wasOverTrash = drag?.overTrash ?? false;
    setDrag(null);
    setGuides({ v: false, h: false });

    if (g.target === "media") {
      if (tap) openText(null);
      else if (Math.abs(g.dx) > 50 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4) {
        const i = STORY_FILTERS.indexOf(designRef.current.filter);
        const next = STORY_FILTERS[(i + (g.dx < 0 ? 1 : -1) + STORY_FILTERS.length) % STORY_FILTERS.length];
        setDesign((d) => ({ ...d, filter: next }));
        flash(STORY_FILTER_LABELS[next]);
      }
      return;
    }
    if (wasOverTrash) {
      if (designRef.current.layers.find((l) => l.id === g.target)?.kind === "music") {
        musicRef.current?.pause();
        setMusicPreview(null);
      }
      setDesign((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== g.target) }));
      return;
    }
    if (tap) {
      const layer = designRef.current.layers.find((l) => l.id === g.target);
      if (layer?.kind === "text") openText(layer);
      else if (layer)
        setDesign((d) => ({
          ...d,
          layers: d.layers.map((l) => (l.id === layer.id && "style" in l ? { ...l, style: (l.style + 1) % STICKER_STYLES } : l)),
        }));
    }
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      gesture.current = null;
      setDrag(null);
      setGuides({ v: false, h: false });
    }
  }

  // ---- Drawing ----------------------------------------------------------

  const drawing = useRef<Stroke | null>(null);

  function drawPoint(e: React.PointerEvent) {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r || !drawing.current) return;
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const p = drawing.current.points;
    // Skip points too close to the last to matter.
    if (p.length >= 2 && Math.hypot((x - p[p.length - 2]) * r.width, (y - p[p.length - 1]) * r.height) < 2) return;
    drawing.current = { ...drawing.current, points: [...p, x, y] };
    setLiveStroke(drawing.current);
  }

  // ---- Share / close ----------------------------------------------------

  const plain = isPlainDesign(design);
  const busy = sharing !== null;

  function close() {
    if (busy) return;
    if (!plain) setConfirmDiscard(true);
    else onCancel();
  }

  const mediaNode =
    media.kind === "image" ? (
      // eslint-disable-next-line @next/next/no-img-element -- local preview of the picked photo
      <img src={media.url} alt="" draggable={false} />
    ) : (
      <video src={media.url} autoPlay loop muted playsInline />
    );

  const editor = (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Story editor">
      <div ref={boxRef} className="relative mx-auto mt-[env(safe-area-inset-top)] flex min-h-0 w-full max-w-[520px] flex-1 items-center justify-center px-1.5 pt-1.5">
        {frame.width > 0 && (
          <StoryFrame
            ref={frameRef}
            design={design}
            media={mediaNode}
            blurUrl={media.kind === "image" ? media.url : null}
            width={frame.width}
            height={frame.height}
            liveStroke={liveStroke}
            hiddenLayerId={mode === "text" ? draft.id : null}
            fadingLayerId={drag?.overTrash ? drag.id : null}
            className="touch-none select-none rounded-[20px]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
            {/* Center guides while dragging. */}
            {guides.v && <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/70" />}
            {guides.h && <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/70" />}

            {/* The bin, while something's being dragged. */}
            {drag && (
              <span
                className={`pointer-events-none absolute bottom-[56px] left-1/2 flex -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-white backdrop-blur-md transition-all duration-150 ${
                  drag.overTrash ? "h-16 w-16 bg-danger/90" : "h-12 w-12 bg-black/40"
                }`}
              >
                <TrashIcon className="h-5 w-5" />
              </span>
            )}

            {toast && (
              <span className="animate-fade-in pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[1.75rem] font-semibold tracking-[-0.02em] [text-shadow:0_2px_12px_rgb(0_0_0/0.5)]">
                {toast}
              </span>
            )}

            {/* Drawing surface. */}
            {mode === "draw" && (
              <div
                className="absolute inset-0 z-10 touch-none"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drawing.current = { tool: pen.tool, color: pen.color, width: pen.width, points: [] };
                  drawPoint(e);
                }}
                onPointerMove={(e) => drawing.current && drawPoint(e)}
                onPointerUp={() => {
                  const s = drawing.current;
                  drawing.current = null;
                  setLiveStroke(null);
                  if (s && s.points.length >= 2) {
                    // A single tap leaves a dot.
                    const stroke = s.points.length === 2 ? { ...s, points: [...s.points, s.points[0] + 0.0005, s.points[1]] } : s;
                    setDesign((d) => ({ ...d, drawing: [...d.drawing, stroke] }));
                  }
                }}
              />
            )}
          </StoryFrame>
        )}

        {/* Top bar over the frame. */}
        {(mode === "idle" || mode === "filters") && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-auto flex max-w-[520px] items-start justify-between px-4 pt-4">
            <span className="pointer-events-auto">
              <ToolButton label="Discard" onClick={close}>
                <CloseIcon className="h-5 w-5" />
              </ToolButton>
            </span>
            <span className="pointer-events-auto flex gap-2.5">
              <ToolButton label="Add text" onClick={() => openText(null)}>
                <TextToolIcon className="h-5 w-5" />
              </ToolButton>
              <ToolButton label="Stickers" onClick={() => setMode("stickers")}>
                <StickerPeelIcon className="h-5 w-5" />
              </ToolButton>
              <ToolButton label="Draw" onClick={() => setMode("draw")}>
                <BrushIcon className="h-5 w-5" />
              </ToolButton>
              <ToolButton label="Filters" active={mode === "filters"} onClick={() => setMode(mode === "filters" ? "idle" : "filters")}>
                <WandIcon className="h-5 w-5" />
              </ToolButton>
            </span>
          </div>
        )}

        {mode === "draw" && (
          <>
            <div className="absolute inset-x-0 top-0 z-20 mx-auto flex max-w-[520px] items-center justify-between px-4 pt-4">
              <ToolButton label="Undo" onClick={() => setDesign((d) => ({ ...d, drawing: d.drawing.slice(0, -1) }))}>
                <UndoIcon className="h-5 w-5" />
              </ToolButton>
              <button type="button" onClick={() => setMode("idle")} className="pressable h-10 rounded-full bg-white px-5 text-[0.9375rem] font-semibold text-black">
                Done
              </button>
            </div>
            <div className="absolute left-2 top-1/2 z-20 -translate-y-1/2">
              <VerticalSlider label="Brush size" min={0.005} max={0.05} value={pen.width} onChange={(w) => setPen((p) => ({ ...p, width: w }))} />
            </div>
          </>
        )}
      </div>

      {/* Bottom bar: share, filters, or the drawing tools. */}
      <div className="mx-auto w-full max-w-[520px] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5">
        {mode === "draw" ? (
          <div className="flex flex-col gap-3">
            <div className="flex justify-center gap-3">
              {TOOLS.map(({ tool, label, Icon }) => (
                <button
                  key={tool}
                  type="button"
                  aria-label={label}
                  aria-pressed={pen.tool === tool}
                  onClick={() => setPen((p) => ({ ...p, tool }))}
                  className={`pressable flex h-11 w-11 items-center justify-center rounded-full transition-colors ${pen.tool === tool ? "bg-white text-black" : "bg-white/10 text-white"}`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
            {pen.tool !== "eraser" && <ColorRow value={pen.color} onChange={(color) => setPen((p) => ({ ...p, color }))} />}
          </div>
        ) : mode === "filters" ? (
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Filter">
            {STORY_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={design.filter === f}
                onClick={() => setDesign((d) => ({ ...d, filter: f }))}
                className="pressable flex flex-shrink-0 flex-col items-center gap-1.5"
              >
                <span className={`relative block h-[62px] w-[48px] overflow-hidden rounded-[12px] bg-white/10 ring-2 transition-colors ${design.filter === f ? "ring-white" : "ring-transparent"}`}>
                  {media.kind === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element -- filter preview
                    <img src={media.url} alt="" className="h-full w-full object-cover" style={{ filter: STORY_FILTER_CSS[f] }} />
                  )}
                </span>
                <span className={`text-[0.6875rem] font-semibold ${design.filter === f ? "text-white" : "text-white/55"}`}>{STORY_FILTER_LABELS[f]}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate pl-1 text-[0.8125rem] text-danger">{error}</p>
            <button
              type="button"
              onClick={() => onShare(designRef.current)}
              disabled={busy || mode !== "idle"}
              className="pressable flex h-12 flex-shrink-0 items-center gap-2 rounded-full bg-white py-1 pl-1.5 pr-4 text-[0.9375rem] font-semibold text-black disabled:opacity-70"
            >
              <Avatar username={me.username} avatarUrl={me.avatarUrl} className="h-9 w-9 text-xs" />
              {sharing ?? "Your story"}
              {!busy && <ChevronRightIcon className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      <TextEditorOverlay
        open={mode === "text"}
        draft={draft}
        onChange={setDraft}
        onDone={finishText}
        textareaRef={textRef}
        frameWidth={frame.width}
      />

      {mode === "stickers" && <StickerSheet onPick={addSticker} onClose={() => setMode("idle")} has={new Set(design.layers.map((l) => l.kind))} />}

      {mode === "music" && !trimming && <SoundPickerSheet onSelect={(sound) => setTrimming(sound)} onClose={() => setMode("idle")} />}
      {trimming && (
        <SoundTrimSheet
          sound={trimming}
          initialStartMs={0}
          onConfirm={(startMs) => addMusic(trimming, startMs)}
          onClose={() => {
            setTrimming(null);
            setMode("idle");
          }}
        />
      )}

      {/* The song, looping its 15 seconds while you edit. */}
      <audio
        ref={musicRef}
        preload="none"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (musicPreview && a.currentTime * 1000 > musicPreview.startMs + SOUND_CLIP_MS) a.currentTime = musicPreview.startMs / 1000;
        }}
        onEnded={(e) => {
          if (!musicPreview) return;
          e.currentTarget.currentTime = musicPreview.startMs / 1000;
          e.currentTarget.play().catch(() => {});
        }}
      />

      {confirmDiscard && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/50" onClick={() => setConfirmDiscard(false)}>
          <div className="animate-sheet-up w-full rounded-t-[26px] bg-[#141416] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-[1rem] font-semibold">Discard this story?</p>
            <p className="mt-1 text-center text-[0.875rem] text-white/55">Your edits won&apos;t be saved.</p>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={onCancel} className="pressable h-12 rounded-2xl bg-white/[0.07] text-[0.9375rem] font-semibold text-danger">
                Discard
              </button>
              <button type="button" onClick={() => setConfirmDiscard(false)} className="pressable h-12 rounded-2xl text-[0.9375rem] font-semibold">
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return isClient ? createPortal(editor, document.body) : null;
}

