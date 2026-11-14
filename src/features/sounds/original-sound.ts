import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { extractAudioTrack } from "@/features/editor/extract-audio";
import { uploadAudio } from "@/lib/storage/upload";
import { createSound, type Sound } from "@/lib/db/sounds";
import { isSilent } from "@/lib/sounds/silence";

/** The title every original sound carries; the poster is the artist, so
 * the feed reads "Original sound · username", as it did before these
 * became real sounds. */
export const ORIGINAL_SOUND_TITLE = "Original sound";

/**
 * A video's own audio as an .m4a, ready to become a sound. Null when the
 * video has no audio track, or one that's silent (the original sound
 * turned all the way down in the editor).
 */
export async function extractOriginalSound(video: File): Promise<File | null> {
  const audio = await extractAudioTrack(video);
  if (!audio) return null;

  // An offline context decodes without needing a tap to start audio.
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const buffer = await ctx.decodeAudioData(await audio.arrayBuffer());
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  return isSilent(channels) ? null : audio;
}

/** Uploads the audio and creates the sound row, credited to the poster. */
export async function createOriginalSound(
  supabase: SupabaseClient<Database>,
  userId: string,
  username: string | null,
  audio: File,
): Promise<Sound> {
  const uploaded = await uploadAudio(supabase, userId, audio);
  return createSound(supabase, {
    owner_id: userId,
    title: ORIGINAL_SOUND_TITLE,
    artist_name: username,
    storage_path: uploaded.storagePath,
    duration_ms: uploaded.durationMs,
    source: "post_audio",
  });
}
