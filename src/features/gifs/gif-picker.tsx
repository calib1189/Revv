"use client";

import { useEffect, useRef, useState } from "react";
import { searchGifsAction, type GifSearchResult } from "@/features/gifs/actions";
import { gifUrl, type GifRef } from "@/lib/gifs";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";

/** Wait this long after the last keystroke before searching — the beta
 * GIPHY key is shared and rate-limited. */
const SEARCH_DELAY_MS = 400;

type Status = "loading" | "ready";

/** The GIF panel that opens above a composer: trending GIFs first, a
 * search field, and a two-column grid. Tapping a GIF sends it straight
 * away, the way Instagram and iMessage do. */
export function GifPicker({
  onPick,
  onClose,
  disabled = false,
}: {
  onPick: (gif: GifRef) => void;
  onClose: () => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<GifSearchResult | null>(null);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    const timer = window.setTimeout(
      () => {
        setStatus("loading");
        searchGifsAction(query)
          .catch((): GifSearchResult => ({ gifs: [], isMock: false, error: "Couldn't load GIFs. Try again in a moment." }))
          .then((next) => {
            if (id !== request.current) return;
            setResult(next);
            setStatus("ready");
          });
      },
      query.trim() ? SEARCH_DELAY_MS : 0,
    );
    return () => window.clearTimeout(timer);
  }, [query]);

  const gifs = result?.gifs ?? [];
  const left = gifs.filter((_, i) => i % 2 === 0);
  const right = gifs.filter((_, i) => i % 2 === 1);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2">
      <div className="flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-foreground/[0.06] px-3">
          <SearchIcon className="h-4 w-4 flex-shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIPHY"
            aria-label="Search GIFs"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={50}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[0.9375rem] text-foreground placeholder:text-muted/60 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close GIFs"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="h-56 overflow-y-auto overscroll-contain rounded-xl">
        {status === "loading" && !result ? (
          <div className="grid grid-cols-2 gap-1.5" aria-label="Loading GIFs">
            {[96, 128, 112, 80, 120, 100].map((h, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-foreground/[0.06]" style={{ height: h }} />
            ))}
          </div>
        ) : result?.error ? (
          <Message>{result.error}</Message>
        ) : result?.isMock ? (
          <Message>GIFs aren&apos;t set up on this server yet (no GIPHY key), so there&apos;s nothing to show.</Message>
        ) : gifs.length === 0 ? (
          <Message>{query.trim() ? `No GIFs for “${query.trim()}”.` : "No GIFs right now."}</Message>
        ) : (
          <div className={`grid grid-cols-2 gap-1.5 transition-opacity ${status === "loading" ? "opacity-50" : ""}`}>
            {[left, right].map((column, c) => (
              <div key={c} className="flex flex-col gap-1.5">
                {column.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick({ id: gif.id, width: gif.width, height: gif.height })}
                    aria-label={gif.title ? `Send ${gif.title}` : "Send GIF"}
                    className="pressable overflow-hidden rounded-lg bg-foreground/[0.06] disabled:opacity-50"
                    style={{ aspectRatio: `${gif.width} / ${gif.height}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- GIPHY serves its own sized rendition */}
                    <img src={gifUrl(gif.id)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GIPHY's terms ask for visible attribution wherever its results show. */}
      <p className="text-right text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-muted">Powered by GIPHY</p>
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <p className="flex h-full items-center justify-center px-6 text-center text-[0.8125rem] text-muted">{children}</p>;
}

/** The small "GIF" button that sits inside a composer's field. */
export function GifButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        // Opening the panel puts the keyboard away so the grid has room;
        // focusing the search field brings it back.
        if (!open && document.activeElement instanceof HTMLElement) document.activeElement.blur();
        onClick();
      }}
      aria-label={open ? "Close GIFs" : "Add a GIF"}
      aria-pressed={open}
      className={`flex h-8 flex-shrink-0 items-center justify-center rounded-full px-1.5 ${open ? "text-accent" : "text-muted hover:text-foreground"}`}
    >
      <span className="rounded-[5px] border-[1.5px] border-current px-1 text-[0.625rem] font-bold leading-[1.1rem] tracking-wide">GIF</span>
    </button>
  );
}
