"use client";

import { useState } from "react";
import { combineClipsFfmpeg } from "@/features/editor/combine-clips-ffmpeg";
import { BackIcon, CheckIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Shown after picking more than one video from the camera roll — lets
 * the owner drop a mis-tap or reorder before they get stitched into one
 * clip. Reordering is up/down buttons rather than drag-and-drop: fewer
 * moving parts, and works identically with mouse, touch, or a screen
 * reader. Combining always uses each clip's full length; trimming the
 * result is still available afterward via the video editor's own Trim
 * tool, same as any other imported video. */
export function ClipCombiner({
  sources,
  onCancel,
  onCombined,
}: {
  sources: File[];
  onCancel: () => void;
  onCombined: (file: File) => void;
}) {
  const [clips, setClips] = useState(sources);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "loading" | "combining">("idle");
  const [progress, setProgress] = useState(0);
  const isCombining = stage !== "idle";

  function move(index: number, direction: -1 | 1) {
    setClips((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(index: number) {
    setClips((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCombine() {
    setError(null);
    // Nothing left to stitch — hand the one remaining clip straight to
    // the editor rather than re-encoding a single file through the
    // combine pipeline for no reason.
    if (clips.length === 1) {
      onCombined(clips[0]);
      return;
    }
    setStage("loading");
    setProgress(0);
    try {
      const { file } = await combineClipsFfmpeg(clips, {
        onLoadProgress: () => setStage("combining"),
        onCombineProgress: setProgress,
      });
      onCombined(file);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Couldn't combine those clips. (${detail})`);
    } finally {
      setStage("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onCancel}
          disabled={isCombining}
          aria-label="Cancel"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium text-white">
          {clips.length} clip{clips.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={handleCombine}
          disabled={isCombining || clips.length === 0}
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {stage === "loading" ? (
            "Preparing…"
          ) : stage === "combining" ? (
            `Combining ${Math.round(progress * 100)}%`
          ) : (
            <>
              <CheckIcon className="h-4 w-4" />
              {clips.length > 1 ? "Combine" : "Continue"}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="px-4 pt-3">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ul className="flex flex-col gap-2">
          {clips.map((clip, index) => (
            <li
              key={`${clip.name}-${clip.lastModified}-${index}`}
              className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{clip.name}</p>
                <p className="text-xs text-white/50">{formatSize(clip.size)}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={isCombining || index === 0}
                  aria-label="Move earlier"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 disabled:opacity-30"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={isCombining || index === clips.length - 1}
                  aria-label="Move later"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 disabled:opacity-30"
                >
                  <ArrowDownIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={isCombining}
                  aria-label={`Remove ${clip.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 disabled:opacity-30"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-white/50">
          Clips play in this order, back to back. You can trim the combined
          result afterward.
        </p>
      </div>
    </div>
  );
}
