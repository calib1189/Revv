"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

/** The garage's showroom: one car per page, swiped horizontally with
 * snap, the next car peeking in from the edge so it's obvious there's
 * more, and page dots underneath (tap to jump). A single car just takes
 * the full width — no dots, no peek. Cards are server-rendered and
 * passed in as children; this only owns scroll position. */
export function GarageShowroom({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const multiple = slides.length > 1;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !multiple) return;
    let frame = 0;
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const first = el.children[0] as HTMLElement | undefined;
        if (!first) return;
        const step = first.offsetWidth + 12; // slide width + gap-3
        setActive(Math.max(0, Math.min(slides.length - 1, Math.round(el.scrollLeft / step))));
      });
    }
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [multiple, slides.length]);

  function goTo(index: number) {
    const el = scrollerRef.current;
    const target = el?.children[index] as HTMLElement | undefined;
    if (!el || !target) return;
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft - 16, behavior: "smooth" });
  }

  if (!multiple) return <div>{slides}</div>;

  return (
    <div>
      <div
        ref={scrollerRef}
        // overscroll-x-contain: the garage sits inside the swipeable tab
        // pager (tab-pager-shell.tsx), itself a horizontal scroller.
        // Without this, swiping past the first/last car would chain into
        // the pager and flip tabs mid-browse.
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6"
        aria-roledescription="carousel"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="w-[86%] flex-shrink-0 snap-start sm:w-[82%]"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
          >
            {slide}
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Choose a car">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Car ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-[7px] rounded-full transition-all duration-300 ease-[var(--ease-ios)] ${
              i === active ? "w-5 bg-foreground" : "w-[7px] bg-foreground/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
