"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  listTrendingSounds,
  searchSounds,
  getSoundUsageCounts,
  publicSoundUrl,
  type Sound,
} from "@/lib/db/sounds";
import { SoundCover } from "@/features/sounds/sound-cover";
import { SoundUploadForm } from "@/features/sounds/sound-upload-form";
import { SoundGenreChips } from "@/features/sounds/sound-genre-chips";
import { soundGenreLabel, type SoundGenre } from "@/lib/sounds/genres";
import { CloseIcon, SearchIcon, PlusIcon, UploadIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type LoadState = "loading" | "ready" | "error";

/** Choosing a sound for a post, the way short-video apps do it: tap a row
 * to hear it, tap Use to put it on the clip. Fixed-dark — it only ever
 * opens over the camera, an editor or the post screen.
 *
 * Fetches its own trending list on open rather than requiring the screen
 * underneath to fetch it up front — most posts never open this at all. */
export function SoundPickerSheet({
  onSelect,
  onClose,
  onPickDeviceFile,
}: {
  onSelect: (sound: Sound) => void;
  onClose: () => void;
  /** Offers audio from the device too, where the caller can mix a raw
   * file in (the video editor can; a photo post's player can't). */
  onPickDeviceFile?: (file: File) => void;
}) {
  const [trending, setTrending] = useState<Sound[]>([]);
  const [trendingState, setTrendingState] = useState<LoadState>("loading");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Sound[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [usageCounts, setUsageCounts] = useState<Map<string, number>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [genre, setGenre] = useState<SoundGenre | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const deviceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      setTrendingState("loading");
      try {
        const sounds = await listTrendingSounds(supabase, 30, genre);
        if (cancelled) return;
        setTrending(sounds);
        setTrendingState("ready");
        const counts = await getSoundUsageCounts(supabase, sounds.map((s) => s.id));
        if (!cancelled) setUsageCounts((prev) => new Map([...prev, ...counts]));
      } catch {
        if (!cancelled) setTrendingState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, genre]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const supabase = createClient();
      try {
        const found = await searchSounds(supabase, trimmed, 20, genre);
        if (cancelled) return;
        setResults(found);
        const counts = await getSoundUsageCounts(supabase, found.map((s) => s.id));
        if (!cancelled) setUsageCounts((prev) => new Map([...prev, ...counts]));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, genre]);

  // Silence on the way out — a preview must never keep playing under the
  // screen this sheet was opened from.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleRowTap(sound: Sound) {
    const audio = audioRef.current;
    if (!audio) return;
    if (activeId === sound.id) {
      if (audio.paused) {
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }
    setActiveId(sound.id);
    audio.src = publicSoundUrl(createClient(), sound.storage_path);
    audio.currentTime = 0;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }

  function use(sound: Sound) {
    audioRef.current?.pause();
    setIsPlaying(false);
    onSelect(sound);
  }

  const searching = query.trim().length > 0;
  const genreLabel = soundGenreLabel(genre);
  const shown = searching ? (results ?? []) : trending;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close sounds"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/65"
      />
      <div
        role="dialog"
        aria-label="Sounds"
        className="animate-sheet-up relative flex h-[88vh] flex-col overflow-hidden rounded-t-[28px] bg-[#121214] text-white ring-1 ring-white/[0.07]"
      >
        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
        {onPickDeviceFile && (
          <input
            ref={deviceInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) {
                audioRef.current?.pause();
                onPickDeviceFile(file);
              }
            }}
          />
        )}

        <div className="flex-shrink-0 px-4 pt-2.5">
          <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-white/20" />
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="text-[1.375rem] font-bold tracking-[-0.025em]">Sounds</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/80"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <label className="flex h-11 items-center gap-2.5 rounded-[14px] bg-white/[0.08] px-3.5 focus-within:bg-white/[0.11]">
            <SearchIcon className="h-[18px] w-[18px] flex-shrink-0 text-white/45" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) {
                  setResults(null);
                  setIsSearching(false);
                }
              }}
              placeholder="Search sounds or artists"
              aria-label="Search sounds"
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-white placeholder:text-white/40 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults(null);
                }}
                aria-label="Clear search"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-black"
              >
                <CloseIcon className="h-3 w-3" strokeWidth={2.5} />
              </button>
            )}
          </label>

          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="pressable flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 text-[0.8125rem] font-semibold text-white"
            >
              <PlusIcon className="h-4 w-4" />
              Upload a sound
            </button>
            {onPickDeviceFile && (
              <button
                type="button"
                onClick={() => deviceInputRef.current?.click()}
                className="pressable flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 text-[0.8125rem] font-semibold text-white"
              >
                <UploadIcon className="h-4 w-4" />
                Audio from this device
              </button>
            )}
          </div>

          <SoundGenreChips value={genre} onChange={setGenre} tone="dark" className="mt-2.5" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <p className="micro-label px-2 pb-2 text-white/40">
            {searching
              ? isSearching
                ? "Searching"
                : genreLabel
                  ? `Results in ${genreLabel}`
                  : "Results"
              : genreLabel
                ? `Trending in ${genreLabel}`
                : "Trending on SORZA"}
          </p>

          {!searching && trendingState === "loading" && <SkeletonRows />}

          {!searching && trendingState === "error" && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-[0.9375rem] font-semibold">Sounds didn&apos;t load</p>
              <p className="text-[0.8125rem] text-white/50">Check your connection and try again.</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="pressable mt-1 h-10 rounded-full bg-white px-5 text-[0.875rem] font-semibold text-black"
              >
                Try again
              </button>
            </div>
          )}

          {searching && isSearching && results === null && <SkeletonRows />}

          {((searching && results !== null) || (!searching && trendingState === "ready")) &&
            shown.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <p className="text-[0.9375rem] font-semibold">
                  {searching
                    ? `Nothing matches “${query.trim()}”`
                    : genreLabel
                      ? `No ${genreLabel} sounds yet`
                      : "No sounds yet"}
                </p>
                <p className="text-[0.8125rem] text-white/50">
                  {searching
                    ? genreLabel
                      ? "Try a different title or artist, or another genre."
                      : "Try a different title or artist."
                    : genreLabel
                      ? "Try another genre, or upload one yourself."
                      : "Upload the first one for everyone to use."}
                </p>
              </div>
            )}

          <ul className="flex flex-col">
            {shown.map((sound) => {
              const active = activeId === sound.id;
              const count = usageCounts.get(sound.id) ?? 0;
              return (
                <li key={sound.id}>
                  <div
                    className={`flex items-center gap-3 rounded-[16px] px-2 py-2 transition-colors duration-200 ${
                      active ? "bg-white/[0.07]" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleRowTap(sound)}
                      aria-label={active && isPlaying ? `Pause ${sound.title}` : `Preview ${sound.title}`}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <SoundCover seed={sound.id} playing={active && isPlaying} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-semibold">{sound.title}</span>
                        <span className="block tabular-nums truncate text-[0.8125rem] text-white/50">
                          {sound.artist_name || "Unknown artist"} · {formatDuration(sound.duration_ms)}
                          {count > 0 && ` · ${formatCompactNumber(count)} ${count === 1 ? "video" : "videos"}`}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => use(sound)}
                      aria-label={`Use ${sound.title}`}
                      className={`pressable h-9 flex-shrink-0 rounded-full px-4 text-[0.8125rem] font-semibold transition-all duration-200 ${
                        active ? "bg-accent text-white" : "bg-white/[0.08] text-white/85"
                      }`}
                    >
                      Use
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {showUpload && (
        <SoundUploadForm
          onClose={() => setShowUpload(false)}
          onUploaded={(sound) => {
            setShowUpload(false);
            use(sound);
          }}
        />
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <ul aria-hidden className="flex flex-col">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-2 py-2">
          <span className="animate-skeleton h-14 w-14 rounded-[15px] bg-white/[0.07]" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="animate-skeleton h-3.5 w-2/5 rounded-full bg-white/[0.08]" />
            <span className="animate-skeleton h-3 w-3/5 rounded-full bg-white/[0.06]" />
          </span>
        </li>
      ))}
    </ul>
  );
}
