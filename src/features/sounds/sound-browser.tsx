"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchSounds, getSoundUsageCounts, publicSoundUrl, type Sound } from "@/lib/db/sounds";
import { SoundCard } from "@/features/sounds/sound-card";
import { SoundUploadForm } from "@/features/sounds/sound-upload-form";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const shown = results ?? initialSounds;

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timeout = setTimeout(async () => {
      const supabase = createClient();
      try {
        const found = await searchSounds(supabase, trimmed);
        setResults(found);
        const counts = await getSoundUsageCounts(supabase, found.map((s) => s.id));
        setUsageCounts((prev) => new Map([...prev, ...counts]));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

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
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
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

      <div className="mt-4 flex flex-col gap-2">
        {shown.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">
            {results ? "No sounds found." : "No sounds yet — be the first to upload one."}
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
            if (onSelect) onSelect(sound);
          }}
        />
      )}
    </div>
  );
}
