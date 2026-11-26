"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAnnouncementBlockedPath } from "@/lib/announcements";
import { markPostAnnouncementSeenAction } from "@/features/announcements/actions";
import type { AnnouncementPopupData } from "@/features/announcements/load-announcement";
import { Avatar } from "@/features/feed/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { CloseIcon, VolumeIcon } from "@/components/ui/icons";

/** The pop-up post (0137): shown once, a beat after the app opens, as a
 * card over a dimmed app. The X, a tap anywhere outside the card, or
 * Escape closes it. It's marked seen the moment it shows, so closing the
 * app instead doesn't bring it back. */
export function AnnouncementPopup({ data }: { data: AnnouncementPopupData }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMuted] = useState(true);
  const [index, setIndex] = useState(0);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || isAnnouncementBlockedPath(pathname) || pathname.startsWith("/feed/new")) return;
    const t = setTimeout(() => {
      shown.current = true;
      setOpen(true);
      void markPostAnnouncementSeenAction(data.postId).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [pathname, data.postId]);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => setOpen(false), 180);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;

  const item = data.media[Math.min(index, data.media.length - 1)];
  // The card follows the post's own shape, from square to a tall phone
  // video, and never gets taller than about half the screen.
  const ratio = item.width && item.height ? Math.min(16 / 9, Math.max(1, item.height / item.width)) : 4 / 3;
  const name = data.author.displayName || data.author.username;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`From ${name}`}
      onClick={close}
      className={`fixed inset-0 z-[95] flex items-center justify-center bg-black/65 px-4 backdrop-blur-[6px] transition-opacity duration-200 ${
        closing ? "opacity-0" : "animate-fade-in opacity-100"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-[400px] overflow-hidden rounded-[28px] bg-surface text-foreground shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)] ring-1 ring-white/10 transition-[transform,opacity] duration-200 ease-[var(--ease-ios)] ${
          closing ? "translate-y-2 scale-[0.98] opacity-0" : "animate-rise-in"
        }`}
      >
        <div className="relative w-full bg-black" style={{ aspectRatio: `1 / ${ratio}`, maxHeight: "52vh" }}>
          {item.kind === "video" ? (
            <video
              key={item.url}
              src={item.url}
              autoPlay
              loop
              muted={muted}
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- the post's own full image, shown once
            <img key={item.url} src={item.url} alt="" className="animate-fade-in absolute inset-0 h-full w-full object-cover" />
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" />

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="pressable absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-md"
          >
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>

          {item.kind === "video" && (
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Turn sound on" : "Turn sound off"}
              className="pressable absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-md"
            >
              <VolumeIcon muted={muted} className="h-[18px] w-[18px]" />
            </button>
          )}

          {data.media.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="absolute inset-y-0 left-0 w-1/3"
              />
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => setIndex((i) => Math.min(data.media.length - 1, i + 1))}
                className="absolute inset-y-0 right-0 w-1/3"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {data.media.map((m, i) => (
                  <span
                    key={m.url}
                    className={`h-1.5 rounded-full transition-all duration-200 ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-5 pt-4">
          <div className="flex items-center gap-2.5">
            <Avatar username={data.author.username} avatarUrl={data.author.avatarUrl} className="h-9 w-9 text-sm" />
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[0.9375rem] font-semibold leading-tight">
                <span className="truncate">{name}</span>
                {data.author.verified && <VerifiedBadge className="h-[15px] w-[15px]" />}
              </p>
              <p className="truncate text-[0.8125rem] text-muted">@{data.author.username}</p>
            </div>
          </div>

          {data.caption && (
            <p className="mt-3 line-clamp-5 whitespace-pre-line text-[0.9375rem] leading-relaxed">{data.caption}</p>
          )}

          <Link
            href={`/p/${data.postId}`}
            onClick={close}
            className="pressable mt-5 flex h-12 w-full items-center justify-center rounded-full bg-accent text-[0.9375rem] font-semibold text-white"
          >
            View post
          </Link>
        </div>
      </div>
    </div>
  );
}
