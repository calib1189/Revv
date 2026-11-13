/**
 * A story's design: everything added on top of the photo or video in the
 * story editor, saved as layers (never burned into the media) so text
 * stays sharp at any size, works the same over video, and stickers stay
 * tappable. Positions are fractions of the 9:16 story frame (0..1, from
 * the top left); sizes are fractions of its width, so a story looks the
 * same on every screen.
 *
 * Everything that comes back from the editor goes through
 * parseStoryDesign on the server: unknown fields dropped, numbers
 * clamped, fonts/colors/filters from fixed lists, and sizes capped.
 */
import type { RankTier } from "@/lib/rating/rank";

export const STORY_FONTS = ["modern", "serif", "strong", "wide", "type", "hand"] as const;
export type StoryFont = (typeof STORY_FONTS)[number];

export const STORY_FONT_LABELS: Record<StoryFont, string> = {
  modern: "Modern",
  serif: "Classic",
  strong: "Strong",
  wide: "Wide",
  type: "Typewriter",
  hand: "Marker",
};

/** The palette for text and drawing. */
export const STORY_COLORS = [
  "#ffffff",
  "#111114",
  "#e1141f",
  "#ff7a1a",
  "#ffd60a",
  "#34c759",
  "#5ac8fa",
  "#0a84ff",
  "#bf5af2",
  "#ff375f",
  "#8e8e93",
] as const;

export const STORY_FILTERS = ["normal", "vivid", "warm", "cool", "fade", "drama", "mono", "noir"] as const;
export type StoryFilter = (typeof STORY_FILTERS)[number];

export const STORY_FILTER_LABELS: Record<StoryFilter, string> = {
  normal: "Normal",
  vivid: "Vivid",
  warm: "Warm",
  cool: "Cool",
  fade: "Fade",
  drama: "Drama",
  mono: "Mono",
  noir: "Noir",
};

/** CSS filters, applied to the media in the editor and the viewer alike. */
export const STORY_FILTER_CSS: Record<StoryFilter, string> = {
  normal: "none",
  vivid: "saturate(1.4) contrast(1.08)",
  warm: "sepia(0.22) saturate(1.25) hue-rotate(-6deg) brightness(1.03)",
  cool: "saturate(1.05) hue-rotate(14deg) contrast(1.04)",
  fade: "contrast(0.86) brightness(1.1) saturate(0.82)",
  drama: "contrast(1.32) saturate(1.12) brightness(0.92)",
  mono: "grayscale(1) contrast(1.08)",
  noir: "grayscale(1) contrast(1.5) brightness(0.88)",
};

export const STROKE_TOOLS = ["pen", "marker", "neon", "eraser"] as const;
export type StrokeTool = (typeof STROKE_TOOLS)[number];

export interface Stroke {
  tool: StrokeTool;
  color: string;
  /** Line width as a fraction of the frame width. */
  width: number;
  /** Flat x,y pairs, each 0..1 of the frame. */
  points: number[];
}

interface LayerBase {
  id: string;
  /** Center, as a fraction of the frame. */
  x: number;
  y: number;
  scale: number;
  /** Radians. */
  rotation: number;
}

export type TextBackground = "none" | "solid" | "soft";
export type TextAlign = "left" | "center" | "right";

export interface TextLayer extends LayerBase {
  kind: "text";
  text: string;
  font: StoryFont;
  color: string;
  bg: TextBackground;
  align: TextAlign;
}

export interface MentionLayer extends LayerBase {
  kind: "mention";
  username: string;
  /** Filled in by the server from the username; never trusted from the editor. */
  userId: string | null;
  style: number;
}

export interface CarLayer extends LayerBase {
  kind: "car";
  vehicleId: string;
  /** Filled in by the server from the poster's own car: its name and
   * real SORZA score at the moment of posting. */
  name: string;
  score: number | null;
  tier: RankTier | null;
  style: number;
}

export interface TimeLayer extends LayerBase {
  kind: "time";
  label: string;
  style: number;
}

export interface LocationLayer extends LayerBase {
  kind: "location";
  name: string;
  style: number;
}

/** A two-option poll. Votes live in story_poll_votes, one per viewer. */
export interface PollLayer extends LayerBase {
  kind: "poll";
  question: string;
  options: [string, string];
}

/** "Ask me a question": viewers answer privately to the poster. */
export interface QuestionLayer extends LayerBase {
  kind: "question";
  prompt: string;
}

/** A song from the sound library, playing from `startMs`. */
export interface MusicLayer extends LayerBase {
  kind: "music";
  soundId: string;
  startMs: number;
  /** Filled in by the server from the sound itself. */
  title: string;
  artist: string;
  style: number;
}

export type StoryLayer = TextLayer | MentionLayer | CarLayer | TimeLayer | LocationLayer | PollLayer | QuestionLayer | MusicLayer;

/** Stickers there can only be one of on a story. */
const ONE_PER_STORY = new Set<StoryLayer["kind"]>(["poll", "question", "music"]);

export const POLL_QUESTION_MAX = 80;
export const POLL_OPTION_MAX = 25;
export const QUESTION_PROMPT_MAX = 80;
export const LOCATION_MAX = 40;
export const QUESTION_ANSWER_MAX = 300;

export interface StoryDesign {
  v: 1;
  /** How the photo or video sits in the frame. Scale 1 fits it whole. */
  media: { scale: number; x: number; y: number; rotation: number };
  filter: StoryFilter;
  layers: StoryLayer[];
  drawing: Stroke[];
}

export const DEFAULT_DESIGN: StoryDesign = {
  v: 1,
  media: { scale: 1, x: 0, y: 0, rotation: 0 },
  filter: "normal",
  layers: [],
  drawing: [],
};

export const MAX_LAYERS = 20;
export const MAX_TEXT = 300;
export const MAX_STROKES = 150;
export const MAX_POINTS = 1200;
/** How many styles each sticker cycles through on tap. */
export const STICKER_STYLES = 3;

const HEX = /^#[0-9a-f]{6}$/;
const USERNAME = /^[a-z0-9_.]{1,30}$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function num(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : fallback;
}

function color(v: unknown): string {
  const c = typeof v === "string" ? v.toLowerCase() : "";
  return HEX.test(c) ? c : "#ffffff";
}

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function base(o: Record<string, unknown>, index: number): LayerBase {
  return {
    id: typeof o.id === "string" && ID.test(o.id) ? o.id : `l${index}`,
    x: num(o.x, 0, 1, 0.5),
    y: num(o.y, 0, 1, 0.5),
    scale: num(o.scale, 0.2, 4, 1),
    rotation: num(o.rotation, -Math.PI * 2, Math.PI * 2, 0),
  };
}

function style(v: unknown): number {
  return Math.round(num(v, 0, STICKER_STYLES - 1, 0));
}

function parseLayer(v: unknown, index: number): StoryLayer | null {
  const o = rec(v);
  if (!o) return null;
  switch (o.kind) {
    case "text": {
      const text = typeof o.text === "string" ? o.text.trim().slice(0, MAX_TEXT) : "";
      if (!text) return null;
      return {
        kind: "text",
        ...base(o, index),
        text,
        font: oneOf(o.font, STORY_FONTS, "modern"),
        color: color(o.color),
        bg: oneOf(o.bg, ["none", "solid", "soft"] as const, "none"),
        align: oneOf(o.align, ["left", "center", "right"] as const, "center"),
      };
    }
    case "mention": {
      const username = typeof o.username === "string" ? o.username.trim().replace(/^@/, "").toLowerCase() : "";
      if (!USERNAME.test(username)) return null;
      return { kind: "mention", ...base(o, index), username, userId: null, style: style(o.style) };
    }
    case "car": {
      const vehicleId = typeof o.vehicleId === "string" && UUID.test(o.vehicleId) ? o.vehicleId : typeof o.vehicleId === "string" && ID.test(o.vehicleId) ? o.vehicleId : "";
      if (!vehicleId) return null;
      return { kind: "car", ...base(o, index), vehicleId, name: "", score: null, tier: null, style: style(o.style) };
    }
    case "location": {
      const name = typeof o.name === "string" ? o.name.trim().slice(0, LOCATION_MAX) : "";
      if (!name) return null;
      return { kind: "location", ...base(o, index), name, style: style(o.style) };
    }
    case "poll": {
      const question = typeof o.question === "string" ? o.question.trim().slice(0, POLL_QUESTION_MAX) : "";
      const options = Array.isArray(o.options) ? o.options.map((x) => (typeof x === "string" ? x.trim().slice(0, POLL_OPTION_MAX) : "")) : [];
      if (!question || options.length !== 2 || !options[0] || !options[1]) return null;
      return { kind: "poll", ...base(o, index), question, options: [options[0], options[1]] };
    }
    case "question": {
      const prompt = typeof o.prompt === "string" ? o.prompt.trim().slice(0, QUESTION_PROMPT_MAX) : "";
      if (!prompt) return null;
      return { kind: "question", ...base(o, index), prompt };
    }
    case "music": {
      if (typeof o.soundId !== "string" || !UUID.test(o.soundId)) return null;
      return {
        kind: "music",
        ...base(o, index),
        soundId: o.soundId,
        startMs: Math.round(num(o.startMs, 0, 60 * 60 * 1000, 0)),
        title: "",
        artist: "",
        style: style(o.style),
      };
    }
    case "time": {
      const label = typeof o.label === "string" ? o.label.trim().slice(0, 12) : "";
      if (!/^[0-9: APMapm.]+$/.test(label)) return null;
      return { kind: "time", ...base(o, index), label, style: style(o.style) };
    }
    default:
      return null;
  }
}

function parseStroke(v: unknown): Stroke | null {
  const o = rec(v);
  if (!o || !Array.isArray(o.points)) return null;
  const raw = o.points.slice(0, MAX_POINTS * 2);
  const points: number[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    points.push(num(raw[i], 0, 1, 0), num(raw[i + 1], 0, 1, 0));
  }
  if (points.length < 4) return null;
  return { tool: oneOf(o.tool, STROKE_TOOLS, "pen"), color: color(o.color), width: num(o.width, 0.004, 0.08, 0.015), points };
}

/** Turns whatever the editor sent into a safe design (see the file note). */
export function parseStoryDesign(input: unknown): StoryDesign {
  const o = rec(input);
  if (!o || o.v !== 1) return DEFAULT_DESIGN;
  const m = rec(o.media) ?? {};
  const seenKinds = new Set<string>();
  const layers = (Array.isArray(o.layers) ? o.layers : [])
    .map((l, i) => parseLayer(l, i))
    .filter((l): l is StoryLayer => {
      if (l === null) return false;
      if (ONE_PER_STORY.has(l.kind)) {
        if (seenKinds.has(l.kind)) return false;
        seenKinds.add(l.kind);
      }
      return true;
    })
    .slice(0, MAX_LAYERS);
  const drawing = (Array.isArray(o.drawing) ? o.drawing : [])
    .map(parseStroke)
    .filter((s): s is Stroke => s !== null)
    .slice(0, MAX_STROKES);
  return {
    v: 1,
    media: {
      scale: num(m.scale, 0.3, 5, 1),
      x: num(m.x, -1, 1, 0),
      y: num(m.y, -1, 1, 0),
      rotation: num(m.rotation, -Math.PI * 2, Math.PI * 2, 0),
    },
    filter: oneOf(o.filter, STORY_FILTERS, "normal"),
    layers,
    drawing,
  };
}

/** Whether the design adds anything to the plain photo or video. */
export function isPlainDesign(d: StoryDesign): boolean {
  return (
    d.layers.length === 0 &&
    d.drawing.length === 0 &&
    d.filter === "normal" &&
    d.media.scale === 1 &&
    d.media.x === 0 &&
    d.media.y === 0 &&
    d.media.rotation === 0
  );
}
