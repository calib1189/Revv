"use client";

import { useEffect, useRef, useState } from "react";
import { BackIcon, CheckIcon } from "@/components/ui/icons";

/** Shared chrome for the posting flow — camera, photo editor, video
 * editor, composer.
 *
 * These screens are one continuous act (shoot → edit → caption → post),
 * laid out the way TikTok and Snapchat have taught everyone to read them:
 * the work fills the screen edge to edge, tools stack down the right side
 * as icons with their names under them, a tool's controls rise from the
 * bottom in a panel with a single Done, and the way forward is one wide
 * button in thumb reach. Everything is fixed-dark rather than
 * theme-following — every one of these screens is full-bleed over a
 * camera feed or a photograph, where a light surface would be wrong in
 * either theme.
 *
 * The forward action uses the app's own red, the same red the Post button
 * ends on, so "keep going" reads the same on every screen of the flow.
 * Selection (a chosen chip, an active tool) is plain white: the work
 * itself is the colourful thing here, not the chrome around it. */

export const STUDIO_ACCENT = "#ff4433";

/** The overlay row across the top of an editor: a round back button on
 * the left, an optional centre slot (the sound pill), nothing on the
 * right — the tool rail starts beneath it. Sits over the preview, so it
 * carries its own shadow rather than a background. */
export function StudioHeader({
  onBack,
  backLabel = "Back",
  center,
}: {
  onBack: () => void;
  backLabel?: string;
  center?: React.ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="pressable pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-xl"
      >
        <BackIcon className="h-[22px] w-[22px]" />
      </button>
      <div className="pointer-events-auto flex min-w-0 justify-center">{center}</div>
      <span />
    </div>
  );
}

/** A button in the flow's own language. `primary` is the solid red
 * forward action; while `busy`, it shows its own progress as a fill
 * sweeping across it, so a long export reads as work being done rather
 * than a stuck button. `ghost` is the quiet secondary choice under it. */
export function StudioAction({
  onClick,
  disabled = false,
  busy = false,
  progress,
  variant = "primary",
  type = "button",
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** 0–1. Only drawn while busy. */
  progress?: number;
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
  children: React.ReactNode;
}) {
  if (variant === "ghost") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className="pressable h-12 rounded-full text-[0.9375rem] font-semibold text-white/70 disabled:opacity-40"
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`pressable relative flex h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-full text-[1rem] font-semibold text-white transition-colors duration-200 ${
        busy ? "bg-white/[0.12]" : "bg-accent shadow-[0_12px_28px_-14px_rgb(255_68_51/0.9)] disabled:opacity-45"
      }`}
    >
      {busy && progress !== undefined && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(0.04, Math.min(1, progress)) * 100}%` }}
        />
      )}
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}

/** The stage the work sits on: as large as the screen allows, rounded,
 * on black. Sizes its child to the largest box of `ratio` that fits —
 * measured, because CSS aspect-ratio can't shrink a box to fit both a
 * max width and a max height at once without distorting it. The child
 * renders at full size until the first measurement lands, so anything it
 * holds (the editors' canvases) exists from the very first render. */
export function StudioStage({ ratio, children }: { ratio: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !(ratio > 0)) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      setSize(
        width / height > ratio
          ? { width: Math.round(height * ratio), height: Math.round(height) }
          : { width: Math.round(width), height: Math.round(width / ratio) },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ratio]);

  return (
    <div
      ref={ref}
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-1.5 pt-[calc(0.25rem+env(safe-area-inset-top))]"
    >
      <div
        className="relative flex-shrink-0"
        style={size ? { width: size.width, height: size.height } : { width: "100%", height: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

/** The bottom deck under the stage — either the forward action, or the
 * open tool's panel. Always solid black, so its controls never fight the
 * picture for contrast. */
export function StudioDeck({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-20 flex-shrink-0 bg-black pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
      {children}
    </div>
  );
}

/** An open tool's controls: its name, a Done that closes it, and the
 * controls themselves. Rises into the deck in place of the forward
 * action, so there's only ever one thing asking to be pressed. */
export function StudioPanel({
  title,
  onDone,
  children,
}: {
  title: string;
  onDone: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-panel-up">
      <div className="flex items-center justify-between px-4 pb-1">
        <p className="text-[0.9375rem] font-semibold text-white">{title}</p>
        <button
          type="button"
          onClick={onDone}
          aria-label={`Done with ${title.toLowerCase()}`}
          className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-white text-black"
        >
          <CheckIcon className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </button>
      </div>
      {children}
    </div>
  );
}

/** A modal bottom sheet on the dark studio surface — camera settings,
 * confirmations. Closes on the backdrop, and on Escape for a keyboard. */
export function StudioSheet({
  title,
  onClose,
  children,
}: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-label={title}
        className="animate-sheet-up relative max-h-[82vh] overflow-y-auto rounded-t-[28px] bg-[#161618] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 text-white ring-1 ring-white/[0.07]"
      >
        <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-white/20" />
        {title && (
          <h2 className="mb-5 px-1 text-[1.25rem] font-bold tracking-[-0.02em]">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}

/** A selectable pill — aspect ratios, speeds, filter categories. */
export function StudioChip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pressable flex-shrink-0 rounded-full px-4 py-2 text-[0.8125rem] tabular-nums transition-colors duration-200 ${
        active ? "bg-white font-semibold text-black" : "bg-white/[0.08] font-medium text-white/75"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** A small round control — rotate, delete, add. */
export function StudioIconButton({
  onClick,
  label,
  tone = "neutral",
  disabled = false,
  children,
}: {
  onClick: () => void;
  label: string;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={`pressable flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full disabled:opacity-35 ${
        tone === "danger" ? "bg-[#ff453a]/15 text-[#ff453a]" : "bg-white/[0.08] text-white/85"
      }`}
    >
      {children}
    </button>
  );
}

/** A labelled slider with its value read out in tabular figures. The
 * track fill is drawn from the value so it reads at a glance which way
 * is "more", the way iOS sliders do. */
export function StudioSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Formatted value shown on the right. Omit to show no read-out. */
  display?: string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[0.8125rem] font-medium text-white/60">{label}</span>
        {display !== undefined && (
          <span className="numeral text-[0.8125rem] font-semibold text-white">{display}</span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="studio-range w-full"
        style={{ "--range-fill": `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

/** A row of colour swatches — text colour, brush colour. */
export function StudioSwatches({
  colors,
  value,
  onChange,
  label,
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5" role="radiogroup" aria-label={label}>
      {colors.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} ${c}`}
            onClick={() => onChange(c)}
            className={`h-7 w-7 flex-shrink-0 rounded-full ring-offset-2 ring-offset-black transition-transform duration-200 ${
              active ? "scale-110 ring-2 ring-white" : "ring-1 ring-white/25"
            }`}
            style={{ backgroundColor: c }}
          />
        );
      })}
    </div>
  );
}

/** The tool rail: icons with their names under them, stacked down the
 * right edge of the preview — TikTok's editor layout. Scrolls if a phone
 * is too short to fit every tool. */
export function StudioRail<T extends string>({
  tools,
  active,
  onSelect,
  hidden = false,
}: {
  tools: { id: T; label: string; icon: React.ComponentType<{ className?: string }>; badge?: boolean }[];
  active: T | null;
  onSelect: (id: T) => void;
  hidden?: boolean;
}) {
  return (
    <div
      className={`no-scrollbar absolute bottom-3 right-1.5 top-[calc(4.25rem+env(safe-area-inset-top))] z-20 flex flex-col items-center gap-3 overflow-y-auto py-1 transition-opacity duration-300 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {tools.map(({ id, label, icon: Icon, badge }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={isActive}
            className="pressable relative flex w-14 flex-shrink-0 flex-col items-center gap-1 text-white [filter:drop-shadow(0_1px_3px_rgb(0_0_0/0.7))]"
          >
            <Icon className="h-[25px] w-[25px]" />
            <span className="text-[0.625rem] font-semibold">{label}</span>
            {badge && (
              <span className="absolute right-2.5 top-0 h-2 w-2 rounded-full bg-accent ring-2 ring-black/40" />
            )}
          </button>
        );
      })}
    </div>
  );
}
