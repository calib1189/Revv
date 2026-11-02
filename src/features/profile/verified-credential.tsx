"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  VERIFIED_CHECK_PATH,
  VERIFIED_SEAL_PATH,
  VerifiedBadge,
} from "@/components/ui/verified-badge";
import { GuillocheRosette } from "@/features/profile/guilloche-rosette";
import { CloseIcon, LockIcon, StarIcon } from "@/components/ui/icons";

/** Fraction of the sheet's height a downward drag has to cross to close
 * it — same feel as comment-sheet.tsx. */
const CLOSE_THRESHOLD = 0.25;

interface Credential {
  username: string;
  isFounder: boolean;
  isOwnProfile: boolean;
}

/** useId's output isn't guaranteed to be a valid url(#…) fragment. */
function useSvgId(): string {
  return useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

/** The seal beside a verified profile's name. The same mark as
 * VerifiedBadge, plus a band of light that crosses it once when the
 * profile arrives; tapping it opens the sheet that says what it means. */
export function VerifiedSeal({ className = "h-6 w-6", ...credential }: Credential & { className?: string }) {
  const [open, setOpen] = useState(false);
  const clipId = useSvgId();
  const sheenId = useSvgId();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Verified account. What this means"
        className="pressable -m-1 inline-flex flex-shrink-0 rounded-full p-1"
      >
        <svg viewBox="0 0 24 24" aria-hidden className={className}>
          <defs>
            <clipPath id={clipId}>
              <path d={VERIFIED_SEAL_PATH} />
            </clipPath>
            <linearGradient id={sheenId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.7" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={VERIFIED_SEAL_PATH} fill="var(--verified)" />
          <g clipPath={`url(#${clipId})`}>
            <rect x="6" y="-4" width="12" height="32" fill={`url(#${sheenId})`} className="animate-verified-sheen" />
          </g>
          <path
            d={VERIFIED_CHECK_PATH}
            fill="none"
            stroke="var(--verified-ink)"
            strokeWidth={2.3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <VerifiedSheet open={open} onClose={() => setOpen(false)} {...credential} />
    </>
  );
}

/** The labelled version for the profile's credential row — the seal alone
 * relies on people already knowing what it means; this says it. */
export function VerifiedChip(credential: Credential) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="pressable inline-flex h-7 items-center gap-1.5 rounded-full bg-verified/[0.13] pl-1 pr-3 text-[0.75rem] font-semibold text-verified"
      >
        <VerifiedBadge className="h-5 w-5" aria-hidden />
        Verified
      </button>
      <VerifiedSheet open={open} onClose={() => setOpen(false)} {...credential} />
    </>
  );
}

function VerifiedSheet({
  open,
  onClose,
  username,
  isFounder,
  isOwnProfile,
}: Credential & { open: boolean; onClose: () => void }) {
  const titleId = useSvgId();
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function handleDragStart(e: React.PointerEvent<HTMLDivElement>) {
    dragStartYRef.current = e.clientY;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartYRef.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStartYRef.current));
  }

  function handleDragEnd() {
    if (dragStartYRef.current === null) return;
    dragStartYRef.current = null;
    const sheetHeight = sheetRef.current?.offsetHeight ?? 0;
    const shouldClose = sheetHeight > 0 && dragY > sheetHeight * CLOSE_THRESHOLD;
    setIsDragging(false);
    setDragY(0);
    if (shouldClose) onClose();
  }

  // Only ever opened by a tap, so document exists by the time this
  // renders. Portalled because the profile header animates in with a
  // retained transform, which would make a fixed child position against
  // the header instead of the screen.
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div aria-hidden className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* The entrance animation lives on this wrapper and the drag on the
          sheet inside it: a running CSS animation overrides an inline
          transform, so putting both on one element would freeze the drag. */}
      <div className="animate-sheet-up absolute inset-x-0 bottom-0 mx-auto max-w-lg">
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={{ transform: `translateY(${dragY}px)` }}
          className={`flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-border bg-surface pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.6)] ${
            isDragging ? "" : "transition-transform duration-300 ease-[var(--ease-ios)]"
          }`}
        >
          <div
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            className="relative flex flex-shrink-0 touch-none justify-center pb-1 pt-2.5"
          >
            <span className="h-1 w-9 rounded-full bg-foreground/15" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted hover:text-foreground"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col items-center px-6 text-center">
            <div className="relative flex h-[164px] w-[164px] flex-shrink-0 items-center justify-center">
              <GuillocheRosette className="absolute inset-0" />
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="animate-seal-stamp relative h-[78px] w-[78px] drop-shadow-[0_10px_24px_rgb(0_0_0/0.35)]"
              >
                <path d={VERIFIED_SEAL_PATH} fill="var(--verified)" />
                <path
                  d={VERIFIED_CHECK_PATH}
                  pathLength={1}
                  fill="none"
                  stroke="var(--verified-ink)"
                  strokeWidth={2.1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-seal-check"
                />
              </svg>
            </div>

            <h2 id={titleId} className="text-[1.375rem] font-bold leading-tight tracking-[-0.02em] [text-wrap:balance]">
              {isOwnProfile ? "Your account is verified" : "Verified account"}
            </h2>
            <p className="mt-1 text-[0.9375rem] font-medium text-verified">@{username}</p>
            <p className="mt-3 max-w-[21rem] text-[0.9375rem] leading-relaxed text-muted [text-wrap:pretty]">
              {isOwnProfile
                ? "SORZA has confirmed this account is really yours. The blue seal shows beside your name on your profile, posts, comments and messages."
                : "SORZA has confirmed this account is authentic. When you see the blue seal next to this name, it's really them."}
            </p>
          </div>

          <ul className="mx-4 mt-6 overflow-hidden rounded-[20px] bg-foreground/[0.045]">
            <SheetFact
              icon={<VerifiedBadge className="h-[22px] w-[22px]" aria-hidden />}
              title="Confirmed by SORZA"
              body="Granted directly by the SORZA team."
              divider={false}
            />
            <SheetFact
              icon={<LockIcon className="h-5 w-5 text-foreground/80" />}
              title="Can't be bought"
              body="It isn't sold in the Shop and can't be switched on in settings."
            />
            {isFounder && (
              <SheetFact
                icon={<StarIcon className="h-[19px] w-[19px] text-accent" />}
                title="Founder & Owner"
                body="Started and owns SORZA."
              />
            )}
          </ul>

          <div className="px-4 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="pressable h-12 w-full rounded-full bg-foreground text-[0.9375rem] font-semibold text-background"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SheetFact({
  icon,
  title,
  body,
  divider = true,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  /** The inset hairline above the row — off for the first one. */
  divider?: boolean;
}) {
  return (
    <li className="relative flex items-center gap-3.5 px-4 py-3.5 text-left">
      {divider && <span aria-hidden className="absolute left-[3.375rem] right-0 top-0 h-px bg-border" />}
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{body}</span>
      </span>
    </li>
  );
}
