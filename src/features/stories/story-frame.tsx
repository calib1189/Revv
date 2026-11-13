"use client";

import { forwardRef, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { STORY_FONT_STYLE, STORY_FONT_VARIABLES } from "@/features/stories/story-fonts";
import { drawStrokes } from "@/features/stories/draw-strokes";
import { STORY_FILTER_CSS, type PollLayer, type QuestionLayer, type StoryDesign, type StoryLayer, type Stroke, type TextLayer } from "@/lib/stories/design";
import { RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { formatScore } from "@/lib/rating/share-text";
import { MusicIcon, PinIcon, WheelIcon } from "@/components/ui/icons";

/**
 * One story, drawn the same way in the editor and the viewer: a 9:16
 * frame with the photo or video placed in it (zoomed, moved, filtered),
 * a soft blurred copy of a photo filling the space around it, the
 * drawing, and every text and sticker layer on top. Everything inside is
 * sized from the frame's width (cqw), so it looks identical at any size.
 */
export const StoryFrame = forwardRef<
  HTMLDivElement,
  {
    design: StoryDesign;
    /** The <img> or <video>, filling the frame (object-contain). */
    media: ReactNode;
    /** A photo's URL, for the blurred backdrop. Videos sit on black. */
    blurUrl?: string | null;
    width: number;
    height: number;
    /** Live strokes drawn on top of the saved ones (the editor's pen). */
    liveStroke?: Stroke | null;
    /** Called when a mention, car or location sticker is tapped in the viewer. */
    onStickerTap?: (layer: StoryLayer) => void;
    /** The viewer's live versions of interactive stickers (polls,
     * questions); return null to draw a layer normally. */
    renderLayer?: (layer: StoryLayer) => ReactNode | null;
    /** Layers the editor is hiding (the one being edited). */
    hiddenLayerId?: string | null;
    /** Marks a layer as being dragged over the bin. */
    fadingLayerId?: string | null;
    className?: string;
    children?: ReactNode;
  } & Omit<React.HTMLAttributes<HTMLDivElement>, "children">
>(function StoryFrame(
  { design, media, blurUrl, width, height, liveStroke, onStickerTap, renderLayer, hiddenLayerId, fadingLayerId, className = "", children, ...rest },
  ref,
) {
  const m = design.media;
  return (
    <div
      ref={ref}
      {...rest}
      className={`relative overflow-hidden bg-black ${STORY_FONT_VARIABLES} ${className}`}
      style={{ width, height, containerType: "size", ...(rest.style ?? {}) }}
    >
      {blurUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- decorative backdrop of the story photo
        <img
          src={blurUrl}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-70"
          style={{ filter: `${STORY_FILTER_CSS[design.filter] === "none" ? "" : STORY_FILTER_CSS[design.filter]} blur(28px) brightness(0.75)` }}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 [&>*]:h-full [&>*]:w-full [&>*]:object-contain"
        style={{
          transform: `translate(${m.x * 100}%, ${m.y * 100}%) rotate(${m.rotation}rad) scale(${m.scale})`,
          filter: STORY_FILTER_CSS[design.filter],
        }}
      >
        {media}
      </div>
      <DrawingLayer strokes={design.drawing} liveStroke={liveStroke} width={width} height={height} />
      {design.layers.map((layer) =>
        layer.id === hiddenLayerId ? null : (
          <LayerView key={layer.id} layer={layer} fading={layer.id === fadingLayerId} onStickerTap={onStickerTap} custom={renderLayer?.(layer) ?? null} />
        ),
      )}
      {children}
    </div>
  );
});

function DrawingLayer({ strokes, liveStroke, width, height }: { strokes: Stroke[]; liveStroke?: Stroke | null; width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dpr] = useState(() => (typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 3)));
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStrokes(ctx, liveStroke ? [...strokes, liveStroke] : strokes, width, height);
  }, [strokes, liveStroke, width, height, dpr]);
  if (strokes.length === 0 && !liveStroke) return null;
  return (
    <canvas
      ref={ref}
      width={Math.round(width * dpr)}
      height={Math.round(height * dpr)}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

/** Light colors get dark text on a solid box, dark colors get white. */
function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 165 ? "#111114" : "#ffffff";
}

/** A text layer's look: its font, color and background box, per line. */
export function textLayerStyle(layer: Pick<TextLayer, "font" | "color" | "bg" | "align">): {
  block: CSSProperties;
  line: CSSProperties;
} {
  const font = STORY_FONT_STYLE[layer.font];
  const box: CSSProperties =
    layer.bg === "none"
      ? { color: layer.color, textShadow: "0 1px 10px rgb(0 0 0 / 0.35)" }
      : {
          color: layer.bg === "solid" ? onColor(layer.color) : layer.color,
          backgroundColor: layer.bg === "solid" ? layer.color : "rgb(0 0 0 / 0.55)",
          padding: "0.1em 0.34em",
          borderRadius: "0.22em",
          WebkitBoxDecorationBreak: "clone",
          boxDecorationBreak: "clone",
        };
  return { block: { ...font, textAlign: layer.align }, line: box };
}

function LayerView({
  layer,
  fading,
  onStickerTap,
  custom,
}: {
  layer: StoryLayer;
  fading: boolean;
  onStickerTap?: (layer: StoryLayer) => void;
  custom: ReactNode | null;
}) {
  const tappable = Boolean(onStickerTap) && (layer.kind === "mention" || layer.kind === "car" || layer.kind === "location");
  const interactive = tappable || custom !== null;
  return (
    <div
      data-layer-id={layer.id}
      className={`absolute select-none transition-opacity duration-150 ${interactive ? "pointer-events-auto" : ""} ${tappable ? "cursor-pointer" : ""} ${fading ? "opacity-40" : ""}`}
      style={{
        left: `${layer.x * 100}%`,
        top: `${layer.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${layer.rotation}rad) scale(${layer.scale * (fading ? 0.6 : 1)})`,
        transition: fading ? "transform 150ms, opacity 150ms" : undefined,
        maxWidth: layer.kind === "text" ? "86cqw" : undefined,
      }}
      onClick={tappable ? (e) => {
        e.stopPropagation();
        onStickerTap?.(layer);
      } : undefined}
      onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
    >
      {custom ?? <LayerContent layer={layer} />}
    </div>
  );
}

export function LayerContent({ layer }: { layer: StoryLayer }) {
  if (layer.kind === "text") {
    const { block, line } = textLayerStyle(layer);
    return (
      <div className="whitespace-pre-wrap break-words" style={{ ...block, width: "max-content", maxWidth: "86cqw" }}>
        <span style={line}>{layer.text}</span>
      </div>
    );
  }
  if (layer.kind === "mention") {
    const styles: CSSProperties[] = [
      { background: "#ffffff", color: "#e1141f" },
      { background: "#e1141f", color: "#ffffff" },
      { background: "rgb(20 20 22 / 0.72)", color: "#ffffff", backdropFilter: "blur(8px)" },
    ];
    return (
      <span
        className="block whitespace-nowrap font-bold"
        style={{ ...styles[layer.style % 3], fontFamily: "var(--font-geist-sans), sans-serif", fontSize: "5.6cqw", padding: "0.32em 0.62em", borderRadius: "0.45em", letterSpacing: "-0.01em" }}
      >
        @{layer.username}
      </span>
    );
  }
  if (layer.kind === "car") {
    const tierColor = layer.tier ? RANK_TEXT_COLORS[layer.tier] : "#ffffff";
    const dark = layer.style !== 1;
    if (layer.style === 2) {
      return (
        <span
          className="flex items-center whitespace-nowrap font-semibold text-white"
          style={{ gap: "0.4em", fontSize: "4.6cqw", padding: "0.42em 0.8em", borderRadius: "999px", background: "rgb(20 20 22 / 0.72)", backdropFilter: "blur(8px)", fontFamily: "var(--font-geist-sans), sans-serif" }}
        >
          <WheelIcon style={{ width: "1.1em", height: "1.1em" }} />
          {layer.name || "My car"}
          {layer.score != null && <span className="numeral" style={{ color: tierColor }}>{formatScore(layer.score)}</span>}
        </span>
      );
    }
    return (
      <span
        className="flex flex-col"
        style={{
          fontFamily: "var(--font-geist-sans), sans-serif",
          minWidth: "38cqw",
          padding: "0.75em 0.95em",
          borderRadius: "0.85em",
          fontSize: "4.2cqw",
          background: dark ? "rgb(14 14 16 / 0.82)" : "#ffffff",
          color: dark ? "#ffffff" : "#111114",
          backdropFilter: dark ? "blur(10px)" : undefined,
          boxShadow: "0 0.4em 1.4em rgb(0 0 0 / 0.3)",
        }}
      >
        <span className="flex items-center font-semibold opacity-70" style={{ gap: "0.35em", fontSize: "0.8em", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          <WheelIcon style={{ width: "1.1em", height: "1.1em" }} />
          SORZA
        </span>
        <span className="mt-[0.2em] whitespace-nowrap font-bold" style={{ fontSize: "1.25em", letterSpacing: "-0.01em" }}>
          {layer.name || "My car"}
        </span>
        {layer.score != null && layer.tier ? (
          <span className="mt-[0.35em] flex items-baseline" style={{ gap: "0.4em" }}>
            <span className="numeral font-bold" style={{ fontSize: "2em", lineHeight: 1, color: dark ? tierColor : "#111114" }}>
              {formatScore(layer.score)}
            </span>
            <span className="font-semibold" style={{ color: dark ? tierColor : "#e1141f" }}>{RANK_LABELS[layer.tier]}</span>
          </span>
        ) : (
          <span className="mt-[0.3em] opacity-60">Not rated yet</span>
        )}
      </span>
    );
  }
  if (layer.kind === "location") {
    const looks: CSSProperties[] = [
      { background: "#ffffff", color: "#e1141f" },
      { background: "rgb(20 20 22 / 0.72)", color: "#ffffff", backdropFilter: "blur(8px)" },
      { background: "#e1141f", color: "#ffffff" },
    ];
    return (
      <span
        className="flex items-center whitespace-nowrap font-bold uppercase"
        style={{ ...looks[layer.style % 3], gap: "0.3em", fontFamily: "var(--font-geist-sans), sans-serif", fontSize: "4.8cqw", padding: "0.4em 0.7em", borderRadius: "0.45em", letterSpacing: "0.01em" }}
      >
        <PinIcon style={{ width: "1.05em", height: "1.05em", flexShrink: 0 }} />
        {layer.name}
      </span>
    );
  }
  if (layer.kind === "poll") return <PollCard layer={layer} />;
  if (layer.kind === "question") return <QuestionCard layer={layer} />;
  if (layer.kind === "music") {
    const title = layer.title || "Song";
    if (layer.style === 1) {
      return (
        <span
          className="flex items-center whitespace-nowrap font-semibold text-white"
          style={{ gap: "0.45em", fontFamily: "var(--font-geist-sans), sans-serif", fontSize: "4.4cqw", padding: "0.45em 0.85em", borderRadius: "999px", background: "rgb(20 20 22 / 0.72)", backdropFilter: "blur(8px)" }}
        >
          <EqBars />
          <span className="max-w-[48cqw] truncate">{title}</span>
        </span>
      );
    }
    const dark = layer.style === 2;
    return (
      <span
        className="flex items-center"
        style={{ gap: "0.6em", fontFamily: "var(--font-geist-sans), sans-serif", fontSize: "4.2cqw", padding: "0.55em 0.95em 0.55em 0.55em", borderRadius: "0.8em", background: dark ? "rgb(14 14 16 / 0.82)" : "#ffffff", color: dark ? "#ffffff" : "#111114", backdropFilter: dark ? "blur(10px)" : undefined, boxShadow: "0 0.4em 1.4em rgb(0 0 0 / 0.25)" }}
      >
        <span className="flex flex-shrink-0 items-center justify-center text-white" style={{ width: "2.6em", height: "2.6em", borderRadius: "0.5em", background: "#e1141f" }}>
          <MusicIcon style={{ width: "1.3em", height: "1.3em" }} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="max-w-[46cqw] truncate font-bold">{title}</span>
          {layer.artist && (
            <span className="max-w-[46cqw] truncate opacity-60" style={{ fontSize: "0.85em" }}>
              {layer.artist}
            </span>
          )}
        </span>
      </span>
    );
  }
  // Time.
  if (layer.style === 1) {
    return (
      <span className="block whitespace-nowrap font-bold" style={{ fontFamily: "var(--font-geist-sans), sans-serif", fontSize: "6cqw", background: "#ffffff", color: "#111114", padding: "0.25em 0.6em", borderRadius: "0.4em" }}>
        {layer.label}
      </span>
    );
  }
  if (layer.style === 2) {
    return (
      <span className="block whitespace-nowrap" style={{ fontFamily: "var(--font-story-serif), serif", fontStyle: "italic", fontSize: "11cqw", color: "#ffffff", textShadow: "0 1px 10px rgb(0 0 0 / 0.35)" }}>
        {layer.label}
      </span>
    );
  }
  return (
    <span className="numeral block whitespace-nowrap" style={{ fontFamily: "var(--font-story-wide), sans-serif", fontWeight: 700, fontSize: "10cqw", color: "#ffffff", letterSpacing: "-0.03em", textShadow: "0 1px 12px rgb(0 0 0 / 0.35)" }}>
      {layer.label}
    </span>
  );
}

/** The largest 9:16 frame that fits the given box. */
export function fitStoryFrame(boxW: number, boxH: number): { width: number; height: number } {
  if (boxW <= 0 || boxH <= 0) return { width: 0, height: 0 };
  const width = Math.min(boxW, (boxH * 9) / 16);
  return { width: Math.floor(width), height: Math.floor((width * 16) / 9) };
}

/** Measures an element, for sizing the story frame inside it. A callback
 * ref, so it starts measuring whenever the element appears (the editor
 * and viewer render a moment after mounting). */
export function useBoxSize<T extends HTMLElement>(): [(el: T | null) => void, { w: number; h: number }] {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    observer.current = ro;
  }, []);
  return [ref, size];
}

function EqBars() {
  return (
    <span className="flex items-end" style={{ gap: "0.12em", height: "0.95em" }} aria-hidden>
      {[0, 180, 90].map((delay) => (
        <span key={delay} className="animate-eq-bar block h-full rounded-full bg-current" style={{ width: "0.16em", animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

const CARD: CSSProperties = {
  fontFamily: "var(--font-geist-sans), sans-serif",
  width: "66cqw",
  borderRadius: "1em",
  background: "#ffffff",
  color: "#111114",
  boxShadow: "0 0.5em 1.6em rgb(0 0 0 / 0.28)",
  fontSize: "4.2cqw",
  overflow: "hidden",
};

/** A poll card. Static in the editor; the viewer passes `results` once
 * there's something to show (after voting, or on your own story) and
 * `onVote` while you can still vote. */
export function PollCard({
  layer,
  results,
  myVote,
  onVote,
}: {
  layer: PollLayer;
  results?: [number, number] | null;
  myVote?: 0 | 1 | null;
  onVote?: (option: 0 | 1) => void;
}) {
  const total = results ? results[0] + results[1] : 0;
  return (
    <div style={CARD}>
      <p className="text-balance text-center font-bold" style={{ padding: "0.9em 1em 0.7em", fontSize: "1.1em", lineHeight: 1.25 }}>
        {layer.question}
      </p>
      <div className="flex flex-col" style={{ gap: "0.45em", padding: "0 0.75em 0.8em" }}>
        {layer.options.map((option, i) => {
          const pct = results && total > 0 ? Math.round((results[i] / total) * 100) : 0;
          const mine = myVote === i;
          const content = (
            <>
              {results && (
                <span
                  className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%`, background: mine ? "rgb(225 20 31 / 0.22)" : "rgb(17 17 20 / 0.08)" }}
                />
              )}
              <span className="relative min-w-0 flex-1 truncate font-semibold" style={{ color: mine ? "#e1141f" : undefined }}>
                {option}
              </span>
              {results && <span className="numeral relative font-bold">{pct}%</span>}
            </>
          );
          const shell = "relative flex w-full items-center overflow-hidden text-left";
          const style: CSSProperties = { gap: "0.5em", padding: "0.7em 0.9em", borderRadius: "0.7em", background: "rgb(17 17 20 / 0.06)" };
          return onVote ? (
            <button key={i} type="button" onClick={() => onVote(i as 0 | 1)} className={`pressable ${shell}`} style={style}>
              {content}
            </button>
          ) : (
            <div key={i} className={shell} style={style}>
              {content}
            </div>
          );
        })}
        {results && (
          <p className="numeral text-center opacity-50" style={{ fontSize: "0.8em", marginTop: "0.1em" }}>
            {total === 1 ? "1 vote" : `${total} votes`}
          </p>
        )}
      </div>
    </div>
  );
}

/** A question box. Static in the editor; the viewer makes it a button
 * that opens the answer field, and shows the count on your own story. */
export function QuestionCard({ layer, onOpen, footer }: { layer: QuestionLayer; onOpen?: () => void; footer?: string }) {
  const inner = (
    <>
      <p className="text-balance text-center font-bold" style={{ padding: "0.9em 1em 0.6em", fontSize: "1.1em", lineHeight: 1.25 }}>
        {layer.prompt}
      </p>
      <span className="mx-[0.75em] mb-[0.8em] block text-center opacity-45" style={{ padding: "0.7em", borderRadius: "0.7em", background: "rgb(17 17 20 / 0.06)" }}>
        {footer ?? "Type something\u2026"}
      </span>
    </>
  );
  return onOpen ? (
    <button type="button" onClick={onOpen} className="pressable block" style={CARD}>
      {inner}
    </button>
  ) : (
    <div style={CARD}>{inner}</div>
  );
}
