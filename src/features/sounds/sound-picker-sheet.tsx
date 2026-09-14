"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listTrendingSounds, type Sound } from "@/lib/db/sounds";
import { SoundBrowser } from "@/features/sounds/sound-browser";
import { CloseIcon } from "@/components/ui/icons";

/** The composer's "choose a sound" launcher — a bottom sheet over the
 * shared SoundBrowser, in picker mode (onSelect instead of navigating to
 * each sound's own page). Fetches the trending list itself on open rather
 * than requiring the composer's server component to fetch it up front —
 * most posts never open this sheet at all. */
export function SoundPickerSheet({
  onSelect,
  onClose,
}: {
  onSelect: (sound: Sound) => void;
  onClose: () => void;
}) {
  const [sounds, setSounds] = useState<Sound[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    listTrendingSounds(supabase)
      .then(setSounds)
      .catch(() => setSounds([]));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="glass-raised relative flex max-h-[80vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Choose a sound</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {sounds === null ? (
          <p className="py-6 text-center text-sm text-muted">Loading sounds…</p>
        ) : (
          <SoundBrowser initialSounds={sounds} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}
