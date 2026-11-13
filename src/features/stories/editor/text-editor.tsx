"use client";

import { useState } from "react";
import { ColorRow, VerticalSlider } from "@/features/stories/editor/controls";
import { textLayerStyle } from "@/features/stories/story-frame";
import { STORY_FONT_STYLE, STORY_FONT_VARIABLES } from "@/features/stories/story-fonts";
import { MAX_TEXT, STORY_FONTS, STORY_FONT_LABELS, type StoryFont, type TextAlign, type TextBackground } from "@/lib/stories/design";
import { useVisualViewportBox } from "@/lib/ui/use-visual-viewport";
import { AlignIcon, TextBackgroundIcon } from "@/components/ui/icons";

export interface TextDraft {
  /** The text layer being edited, or null for a new one. */
  id: string | null;
  text: string;
  font: StoryFont;
  color: string;
  bg: TextBackground;
  align: TextAlign;
  scale: number;
}

const NEXT_ALIGN: Record<TextAlign, TextAlign> = { center: "left", left: "right", right: "center" };
const NEXT_BG: Record<TextBackground, TextBackground> = { none: "solid", solid: "soft", soft: "none" };

/**
 * Typing on a story: the text appears exactly as it will on the story
 * (font, color, background box, size) while you type. Size on the left,
 * fonts or colors along the bottom right above the keyboard.
 *
 * Always mounted, just hidden, so the editor can focus its field inside
 * the tap that opens it (the only way iOS raises the keyboard).
 */
export function TextEditorOverlay({
  open,
  draft,
  onChange,
  onDone,
  textareaRef,
  frameWidth,
}: {
  open: boolean;
  draft: TextDraft;
  onChange: (d: TextDraft) => void;
  onDone: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  frameWidth: number;
}) {
  const vv = useVisualViewportBox(open);
  const [panel, setPanel] = useState<"fonts" | "colors">("fonts");
  const { block, line } = textLayerStyle(draft);
  const fontSize = `calc(${String(STORY_FONT_STYLE[draft.font].fontSize)} * ${draft.scale})`;
  const pad = draft.bg === "none" ? "0" : "0.34em";
  const keep = (e: React.SyntheticEvent) => e.preventDefault();

  return (
    <div
      className={`fixed inset-x-0 z-[85] flex flex-col bg-black/55 backdrop-blur-[3px] transition-opacity duration-200 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={vv ? { top: vv.top, height: vv.height } : { top: 0, bottom: 0 }}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex gap-2">
          <IconToggle label={`Align ${draft.align}`} onClick={() => onChange({ ...draft, align: NEXT_ALIGN[draft.align] })}>
            <AlignIcon align={draft.align} className="h-5 w-5" />
          </IconToggle>
          <IconToggle label="Text background" onClick={() => onChange({ ...draft, bg: NEXT_BG[draft.bg] })}>
            <TextBackgroundIcon mode={draft.bg} className="h-5 w-5" />
          </IconToggle>
          <IconToggle label={panel === "fonts" ? "Colors" : "Fonts"} onClick={() => setPanel(panel === "fonts" ? "colors" : "fonts")}>
            {panel === "fonts" ? (
              <span className="h-5 w-5 rounded-full ring-2 ring-white" style={{ background: draft.color }} />
            ) : (
              <span className="text-[1rem] font-bold leading-none">Aa</span>
            )}
          </IconToggle>
        </div>
        <button type="button" onPointerDown={keep} onClick={onDone} className="pressable h-10 rounded-full bg-white px-5 text-[0.9375rem] font-semibold text-black">
          Done
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center" onPointerDown={(e) => e.target === e.currentTarget && onDone()}>
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <VerticalSlider label="Text size" min={0.5} max={3} value={draft.scale} onChange={(scale) => onChange({ ...draft, scale })} />
        </div>
        <div className={`flex justify-center ${STORY_FONT_VARIABLES}`} style={{ width: frameWidth || "100%", containerType: "inline-size" }}>
          {/* The styled text, with the real field laid exactly over it. */}
          <div className="grid" style={{ ...block, fontSize, maxWidth: "86cqw", width: "max-content", minWidth: "1ch" }}>
            <div aria-hidden className="pointer-events-none col-start-1 row-start-1 whitespace-pre-wrap break-words">
              <span style={line}>{draft.text + "​"}</span>
            </div>
            <textarea
              ref={textareaRef}
              value={draft.text}
              onChange={(e) => onChange({ ...draft, text: e.target.value.slice(0, MAX_TEXT) })}
              rows={1}
              cols={1}
              aria-label="Story text"
              autoCapitalize="sentences"
              enterKeyHint="enter"
              className="col-start-1 row-start-1 min-w-0 resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent text-transparent caret-white outline-none"
              style={{ font: "inherit", letterSpacing: "inherit", lineHeight: "inherit", textAlign: draft.align, paddingInline: pad, width: "100%" }}
            />
          </div>
        </div>
      </div>

      <div className="pb-3 pt-2">
        {panel === "fonts" ? (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Font">
            {STORY_FONTS.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={draft.font === f}
                onPointerDown={keep}
                onClick={() => onChange({ ...draft, font: f })}
                className={`pressable h-9 flex-shrink-0 rounded-full px-4 transition-colors ${STORY_FONT_VARIABLES} ${
                  draft.font === f ? "bg-white text-black" : "bg-black/45 text-white ring-1 ring-white/25"
                }`}
              >
                <span style={{ ...STORY_FONT_STYLE[f], fontSize: f === "strong" ? "1.125rem" : "0.875rem", lineHeight: 1 }}>{STORY_FONT_LABELS[f]}</span>
              </button>
            ))}
          </div>
        ) : (
          <ColorRow value={draft.color} onChange={(color) => onChange({ ...draft, color })} />
        )}
      </div>
    </div>
  );
}

function IconToggle({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
    >
      {children}
    </button>
  );
}
