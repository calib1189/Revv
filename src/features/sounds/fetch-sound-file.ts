"use client";

import { createClient } from "@/lib/supabase/client";
import { publicSoundUrl, type Sound } from "@/lib/db/sounds";

/** Pulls a library sound down as a real File so the video editor can mix
 * it into the exported clip the same way it mixes a track picked off the
 * device. A video's audience hears the file's own track and nothing else
 * — there is no second audio element playing over a video in the feed —
 * so a library sound that isn't baked in at export time is silently
 * inaudible, which is exactly how attaching one to a video used to
 * behave. */
export async function fetchSoundFile(sound: Sound): Promise<File> {
  const url = publicSoundUrl(createClient(), sound.storage_path);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Couldn't download that sound (${response.status}).`);
  }
  const blob = await response.blob();
  // The extension matters: decodeAudioData reads the bytes either way,
  // but a File with no usable name shows up as "blob" in any UI that
  // falls back to it.
  const extension = sound.storage_path.split(".").pop() || "mp3";
  return new File([blob], `${sound.title}.${extension}`, {
    type: blob.type || "audio/mpeg",
  });
}
