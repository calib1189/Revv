"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  searchSounds,
  getSoundUsageCounts,
  listTrendingSounds,
  publicSoundUrl,
  type Sound,
} from "@/lib/db/sounds";
import { SoundCard } from "@/features/sounds/sound-card";
import { SoundUploadForm } from "@/features/sounds/sound-upload-form";
import { SoundGenreChips } from "@/features/sounds/sound-genre-chips";
import { soundGenreLabel, type SoundGenre } from "@/lib/sounds/genres";
import { SearchIcon, PlusIcon } from "@/components/ui/icons";

/** Browse + search a shared sound library, with an inline play preview and
 * an "Upload a sound" flow — used both as Discover's Sounds tab (plain
 * links to each sound's page) and inside the post composer's picker sheet
 * (onSelect instead of navigating). Exactly one of onSelect/linkPrefix is
 * expected; SoundCard forwards whichever one it gets. */
export function SoundBrowser({
  initialSounds,
  onSelect,
  linkPrefix = "/sounds/",
}: {
  initialSounds: Sound[];
  onSelect?: (sound: Sound) => void;
  linkPrefix?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Sound[] | null>(null);
  const [usageCounts, setUsageCounts] = useState<Map<string, number>>(new Map());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [genre, setGenre] = useState<SoundGenre | null>(null);
  // One genre's list, fetched when its chip is picked. "All" is the
  // server-provided list, so it needs no fetch of its own.
  const [genreList, setGenreList] = useState<{ genre: SoundGenre; sounds: Sound[] } | "error" | null>(null);
  const [genreReload, setGenreReload] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const searching = query.trim().length > 0;
  const genreLabel = soundGenreLabel(genre);
  const genreState: "ready" | "loading" | "error" =
    genre === null
      ? "ready"
      : genreList === "error"
        ? "error"
        : genreList?.genre === genre
          ? "ready"
          : "loading";
  const browseList = genre === null ? initialSounds : genreList !== "error" && genreList?.genre === genre ? genreList.sounds : [];
  const shown = searching ? (results ?? []) : browseList;

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      const supabase = createClient();
      try {
        const found = await searchSounds(supabase, trimmed, 20, genre);
        if (cancelled) return;
        setResults(found);
        const counts = await getSoundUsageCounts(supabase, found.map((s) => s.id));
        if (!cancelled) setUsageCounts((prev) => new Map([...prev, ...counts]));
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, genre]);

  useEffect(() => {
    if (genre === null) return;
    let cancelled = false;
    const supabase = createClient();
    listTrendingSounds(supabase, 30, genre)
      .then(async (sounds) => {
        if (cancelled) return;
        setGenreList({ genre, sounds });
        const counts = await getSoundUsageCounts(supabase, sounds.map((s) => s.id));
        if (!cancelled) setUsageCounts((prev) => new Map([...prev, ...counts]));
      })
      .catch(() => {
        if (!cancelled) setGenreList("error");
      });
    return () => {
      cancelled = true;
    };
  }, [genre, genreReload]);

  useEffect(() => {
    const supabase = createClient();
    getSoundUsageCounts(supabase, initialSounds.map((s) => s.id))
      .then((counts) => {
        setUsageCounts((prev) => new Map([...prev, ...counts]));
      })
      .catch(() => {
        // Usage counts are supplementary display data (a small "N videos"
        // line) — a failed count fetch shouldn't block the list itself
        // from showing, so this just leaves counts at their 0 default.
      });
    // Only needs to run for the initial server-provided list — a live
    // search result set fetches its own counts alongside the search
    // itself, right above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePlay(sound: Sound) {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingId === sound.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    const supabase = createClient();
    audio.src = publicSoundUrl(supabase, sound.storage_path);
    audio.play().catch(() => {});
    setPlayingId(sound.id);
  }

  return (
    <div>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      <div className="flex items-center gap-2">
        <div className="glass-inset flex flex-1 items-center gap-2 rounded-full px-4 py-2.5">
          <SearchIcon className="h-4 w-4 flex-shrink-0 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setResults(null);
            }}
            placeholder="Search sounds…"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted/60 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          aria-label="Upload a sound"
          className="glass flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-foreground"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      <SoundGenreChips
        value={genre}
        onChange={(next) => {
          setGenre(next);
          setGenreList(null);
        }}
        className="mt-3 sm:mx-0 sm:px-0"
      />

      <div className="mt-3 flex flex-col gap-2" aria-busy={!searching && genreState === "loading"}>
        {!searching && genreState === "loading" &&
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} aria-hidden className="glass-inset flex items-center gap-3 rounded-xl px-3 py-2.5">
              <span className="animate-skeleton h-10 w-10 rounded-full bg-foreground/[0.07]" />
              <span className="flex flex-1 flex-col gap-2">
                <span className="animate-skeleton h-3 w-2/5 rounded-full bg-foreground/[0.08]" />
                <span className="animate-skeleton h-2.5 w-3/5 rounded-full bg-foreground/[0.06]" />
              </span>
            </div>
          ))}
        {!searching && genreState === "error" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted">{genreLabel} sounds didn&apos;t load.</p>
            <button
              type="button"
              onClick={() => {
                setGenreList(null);
                setGenreReload((n) => n + 1);
              }}
              className="pressable h-9 rounded-full bg-foreground px-4 text-[0.8125rem] font-semibold text-background"
            >
              Try again
            </button>
          </div>
        )}
        {(searching ? results !== null : genreState === "ready") && shown.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">
            {searching
              ? "No sounds found."
              : genreLabel
                ? `No ${genreLabel} sounds yet. Upload one, or try another genre.`
                : "No sounds yet — be the first to upload one."}
          </p>
        )}
        {shown.map((sound) => (
          <SoundCard
            key={sound.id}
            sound={sound}
            usageCount={usageCounts.get(sound.id) ?? 0}
            isPlaying={playingId === sound.id}
            onTogglePlay={() => togglePlay(sound)}
            href={onSelect ? undefined : `${linkPrefix}${sound.id}`}
            onSelect={onSelect ? () => onSelect(sound) : undefined}
          />
        ))}
      </div>

      {showUpload && (
        <SoundUploadForm
          onClose={() => setShowUpload(false)}
          onUploaded={(sound) => {
            setShowUpload(false);
            setResults((prev) => (prev ? [sound, ...prev] : prev));
            if (genre !== null && sound.genre === genre) {
              setGenreList((prev) => (prev && prev !== "error" && prev.genre === genre ? { genre, sounds: [sound, ...prev.sounds] } : prev));
            }
            if (onSelect) onSelect(sound);
          }}
        />
      )}
    </div>
  );
}
