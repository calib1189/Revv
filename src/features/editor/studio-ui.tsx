"use client";

/** Shared chrome for the posting flow — camera, photo editor, video
 * editor, composer.
 *
 * These four screens are one continuous act (shoot → edit → caption →
 * post) but each had grown its own header, its own pill styling, its own
 * bare `<input type="range">` and its own idea of where a panel sits.
 * Moving between them felt like moving between apps. Everything here is
 * deliberately dark and fixed-palette rather than theme-following: all
 * four screens are full-bleed over a camera feed or a photograph, where
 * a light surface would be wrong in either theme.
 *
 * The accent is the editing yellow the camera and both editors already
 * used, now applied consistently — it reads as "you are working on
 * something", distinct from the app's own red, which stays reserved for
 * publishing and destructive actions. */

export const STUDIO_ACCENT = "#ffd60a";

/** The top bar: a ghost dismiss on the left, a quiet eyebrow in the
 * middle, and the one forward action as a solid pill on the right.
 *
 * The pill is the part that changes the feel most. Both editors used to
 * end in plain yellow text that looked like every other label on screen,
 * which made the single most important control on the screen the hardest
 * one to find. */
export function StudioHeader({
  eyebrow,
  onCancel,
  cancelLabel = "Cancel",
  action,
}: {
  eyebrow: string;
  onCancel: () => void;
  cancelLabel?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="relative z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onCancel}
        className="pressable justify-self-start rounded-full bg-white/10 px-3.5 py-2 text-[0.875rem] font-medium text-white/90 backdrop-blur-xl"
      >
        {cancelLabel}
      </button>
      <p className="micro-label text-white/45">{eyebrow}</p>
      <div className="justify-self-end">{action}</div>
    </div>
  );
}

/** The forward action itself — solid accent when it's ready to be
 * pressed, and a quiet progress state while something is encoding, so a
 * long export reads as work in progress rather than a stuck button. */
export function StudioAction({
  onClick,
  disabled = false,
  busy = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`pressable rounded-full px-4 py-2 text-[0.9375rem] font-semibold transition-colors ${
        busy ? "bg-white/15 text-white/80" : "text-black disabled:opacity-45"
      }`}
      style={busy ? undefined : { background: STUDIO_ACCENT }}
    >
      {children}
    </button>
  );
}

/** The stage a photo or a clip sits on while it's being edited. A wide
 * radius, a hairline and a deep shadow over a soft vignette, so the work
 * reads as a physical object on a table rather than a canvas welded to a
 * black background. */
export function StudioStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 50% 42%, rgb(255 255 255 / 0.07) 0%, transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}

/** A tool's controls, presented as a floating tray above the rail rather
 * than a flat strip welded to the bottom of the screen. */
export function StudioPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-sheet-up mx-3 mb-2 overflow-hidden rounded-[22px] bg-white/[0.07] ring-1 ring-white/10 backdrop-blur-2xl">
      {children}
    </div>
  );
}

/** A selectable pill — aspect ratios, speeds, filter categories, fonts.
 * One implementation instead of the four slightly different ones the two
 * editors had between them. */
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
      className={`pressable flex-shrink-0 rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors ${
        active ? "bg-white font-semibold text-black" : "bg-white/10 font-medium text-white/75"
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
  children,
}: {
  onClick: () => void;
  label: string;
  tone?: "neutral" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`pressable flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
        tone === "danger" ? "bg-[#ff453a]/15 text-[#ff453a]" : "bg-white/10 text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

/** A labelled slider with its value read out in tabular figures. The
 * editors previously dropped bare range inputs into flex rows, so the
 * numbers they controlled were invisible and every one of them sat at a
 * slightly different width. */
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
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="micro-label text-white/50">{label}</span>
        {display !== undefined && (
          <span className="numeral text-[0.8125rem] text-white/85">{display}</span>
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
        className="w-full"
        style={{ accentColor: STUDIO_ACCENT }}
      />
    </div>
  );
}

/** The bottom tool rail. Scrolls horizontally: nine tools laid out to
 * fit the screen need more width than a phone has, and the two that fell
 * off the end were simply unreachable. */
export function StudioRail<T extends string>({
  tools,
  active,
  onSelect,
}: {
  tools: { id: T; label: string; icon: React.ComponentType<{ className?: string }> }[];
  active: T | null;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="no-scrollbar fade-edge-r flex items-center gap-1 overflow-x-auto px-3 py-1.5">
      {tools.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={isActive}
            className={`flex w-[4.25rem] flex-shrink-0 flex-col items-center gap-1 rounded-[14px] py-2 transition-colors ${
              isActive ? "bg-white/10" : ""
            }`}
            style={isActive ? { color: STUDIO_ACCENT } : { color: "rgb(255 255 255 / 0.65)" }}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[0.6875rem] font-semibold">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
