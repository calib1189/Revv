import { Bebas_Neue, Instrument_Serif, Permanent_Marker, Unbounded } from "next/font/google";
import type { CSSProperties } from "react";
import type { StoryFont } from "@/lib/stories/design";

// Only fetched where a story uses them (no preload): the story editor
// and viewer. "Modern" and "Typewriter" are the app's own Geist faces.
const serif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-story-serif", preload: false });
const strong = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-story-strong", preload: false });
const wide = Unbounded({ subsets: ["latin"], variable: "--font-story-wide", preload: false });
const hand = Permanent_Marker({ weight: "400", subsets: ["latin"], variable: "--font-story-hand", preload: false });

/** Put on the story frame so its layers can use the story fonts. */
export const STORY_FONT_VARIABLES = `${serif.variable} ${strong.variable} ${wide.variable} ${hand.variable}`;

/** Each font's look, sized relative to the frame (cqw: % of its width). */
export const STORY_FONT_STYLE: Record<StoryFont, CSSProperties> = {
  modern: { fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 700, letterSpacing: "-0.02em", fontSize: "7.4cqw", lineHeight: 1.2 },
  serif: { fontFamily: "var(--font-story-serif), Georgia, serif", fontStyle: "italic", fontSize: "9cqw", lineHeight: 1.1 },
  strong: { fontFamily: "var(--font-story-strong), Impact, sans-serif", fontSize: "10.5cqw", letterSpacing: "0.02em", lineHeight: 1.02 },
  wide: { fontFamily: "var(--font-story-wide), system-ui, sans-serif", fontWeight: 700, fontSize: "6.2cqw", letterSpacing: "-0.01em", lineHeight: 1.2 },
  type: { fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontSize: "6.4cqw", lineHeight: 1.3 },
  hand: { fontFamily: "var(--font-story-hand), cursive", fontSize: "7.8cqw", lineHeight: 1.2 },
};
