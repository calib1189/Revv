import type { StoreItem } from "@/lib/store/catalog";
import { FlagIcon, WheelIcon } from "@/components/ui/icons";

export type LookScope = "profile" | "garage" | "crew";

export interface Look {
  /** A name color (profile name, nameplate or crew name). */
  text: StoreItem | null;
  /** A profile background or crew banner. */
  background: StoreItem | null;
  /** A showcase frame or crew badge frame. */
  ring: StoreItem | null;
}

/** Text in a store name color: a flat color, or a gradient clipped to
 * the letters (with its shimmer class, for the epic ones). */
export function StyledName({ item, children, className = "" }: { item: StoreItem | null; children: React.ReactNode; className?: string }) {
  if (!item) return <span className={`text-white ${className}`}>{children}</span>;
  const gradient = item.value.includes("gradient");
  return (
    <span
      className={`${gradient ? "bg-clip-text text-transparent" : ""} ${item.effectClassName ?? ""} ${className}`}
      style={gradient ? { backgroundImage: item.value } : { color: item.value }}
    >
      {children}
    </span>
  );
}

/**
 * How the viewer would look wearing a set of cosmetics: their profile
 * header (background, name color, showcase frame), their car's nameplate,
 * or their crew's banner and badge. Uses the same values and classes the
 * real pages do, so what's previewed is what other people see.
 */
export function LookPreview({ scope, label, look, compact = false }: { scope: LookScope; label: string; look: Look; compact?: boolean }) {
  const height = compact ? "h-[132px]" : "h-[176px]";
  const nameSize = compact ? "text-[1.125rem]" : "text-[1.5rem]";

  if (scope === "garage") {
    return (
      <div className={`relative ${height} overflow-hidden rounded-[22px] bg-[#0c0c0f] ring-1 ring-white/[0.06]`}>
        <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_80%_10%,rgba(255,255,255,0.08),transparent_60%)]" />
        <WheelIcon className="absolute -right-6 -top-6 h-32 w-32 text-white/[0.05]" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="micro-label text-white/45">Garage</p>
          <StyledName item={look.text} className={`mt-1 block truncate font-bold tracking-[-0.02em] ${nameSize}`}>
            {label}
          </StyledName>
        </div>
      </div>
    );
  }

  const initial = label.replace(/^@/, "").charAt(0).toUpperCase() || "S";
  return (
    <div className={`relative ${height} overflow-hidden rounded-[22px] bg-[#0c0c0f] ring-1 ring-white/[0.06]`}>
      {look.background ? (
        <div
          className={`absolute inset-0 opacity-90 ${look.background.effectClassName ?? ""}`}
          style={{ backgroundImage: look.background.value }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_80%_0%,rgba(255,255,255,0.08),transparent_60%)]" />
      )}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          {scope === "crew" ? (
            <span
              className={`flex flex-shrink-0 items-center justify-center rounded-full bg-white/12 text-white ${compact ? "h-10 w-10" : "h-12 w-12"} ${look.ring?.value ?? ""}`}
            >
              <FlagIcon className="h-5 w-5" />
            </span>
          ) : (
            <span
              className={`flex flex-shrink-0 items-center justify-center rounded-full bg-white/12 font-bold text-white ${compact ? "h-10 w-10 text-[1rem]" : "h-12 w-12 text-[1.125rem]"}`}
            >
              {initial}
            </span>
          )}
          <StyledName item={look.text} className={`min-w-0 truncate font-bold tracking-[-0.02em] ${nameSize}`}>
            {label}
          </StyledName>
        </div>
        {scope === "profile" && (
          <span
            className={`relative flex flex-shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-neutral-600 to-neutral-900 ${compact ? "h-11 w-14" : "h-14 w-[4.5rem]"} ${look.ring?.value ?? ""}`}
            aria-label="Showcase"
          >
            <WheelIcon className="h-6 w-6 text-white/70" />
          </span>
        )}
      </div>
    </div>
  );
}
