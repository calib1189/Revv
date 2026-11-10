"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { CloseIcon } from "@/components/ui/icons";
import { useHideBottomNav } from "@/lib/ui/use-hide-bottom-nav";

export interface ViewerPhoto {
  url: string;
  alt?: string;
}

const subscribeNever = () => () => {};

/**
 * A photo full screen: black background, the whole photo (nothing
 * cropped), swipe sideways through the rest, close with the X, a tap on
 * the background or Escape. Opened by tapping a car's cover photo or any
 * photo in its gallery.
 */
export function PhotoViewer({
  photos,
  startIndex,
  onClose,
}: {
  photos: ViewerPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  const stripRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);
  useHideBottomNav(true);

  // Opens on the photo that was tapped, not the first one.
  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (strip) strip.scrollLeft = startIndex * strip.clientWidth;
  }, [isClient, startIndex]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const strip = stripRef.current;
      if (e.key === "Escape") onClose();
      if (!strip) return;
      if (e.key === "ArrowRight") strip.scrollBy({ left: strip.clientWidth, behavior: "smooth" });
      if (e.key === "ArrowLeft") strip.scrollBy({ left: -strip.clientWidth, behavior: "smooth" });
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!isClient) return null;

  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-[70] bg-black" role="dialog" aria-modal="true" aria-label="Photo">
      <div
        ref={stripRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
      >
        {photos.map((photo, i) => (
          <div
            key={`${photo.url}-${i}`}
            className="relative h-full w-full flex-shrink-0 snap-center"
            // A tap on the black around the photo closes it.
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <Image
              src={photo.url}
              alt={photo.alt ?? ""}
              fill
              sizes="100vw"
              priority={i === startIndex}
              className="pointer-events-none object-contain"
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        {photos.length > 1 ? (
          <span className="numeral rounded-full bg-white/12 px-3 py-1.5 text-[0.8125rem] font-semibold text-white backdrop-blur-xl">
            {index + 1} / {photos.length}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="pressable pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-xl"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
