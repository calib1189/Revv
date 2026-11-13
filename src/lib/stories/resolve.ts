// Server-only. Fills in the parts of a story design the editor is never
// trusted with: who a mention points at, and a car sticker's name and
// real SORZA score. Anything that doesn't check out is dropped.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { rankForScore } from "@/lib/rating/rank";
import { getSoundsByIds } from "@/lib/db/sounds";
import { clampSoundStartMs } from "@/lib/validation/sound";
import type { StoryDesign, StoryLayer } from "@/lib/stories/design";

export async function resolveStoryDesign(
  supabase: SupabaseClient<Database>,
  authorId: string,
  design: StoryDesign,
): Promise<StoryDesign> {
  const usernames = [...new Set(design.layers.flatMap((l) => (l.kind === "mention" ? [l.username] : [])))];
  const wantsCars = design.layers.some((l) => l.kind === "car");
  const soundIds = design.layers.flatMap((l) => (l.kind === "music" ? [l.soundId] : []));

  const [mentioned, cars, sounds] = await Promise.all([
    usernames.length > 0
      ? supabase.from("profiles").select("id, username").in("username", usernames).then(({ data }) => data ?? [])
      : Promise.resolve([] as { id: string; username: string }[]),
    wantsCars ? myCars(supabase, authorId) : Promise.resolve(new Map<string, StoryCar>()),
    soundIds.length > 0 ? getSoundsByIds(supabase, soundIds) : Promise.resolve([]),
  ]);
  const soundById = new Map(sounds.map((s) => [s.id, s]));
  const idByUsername = new Map(mentioned.map((p) => [p.username.toLowerCase(), p.id]));

  const layers: StoryLayer[] = [];
  for (const layer of design.layers) {
    if (layer.kind === "mention") {
      const userId = idByUsername.get(layer.username);
      if (userId) layers.push({ ...layer, userId });
    } else if (layer.kind === "music") {
      const sound = soundById.get(layer.soundId);
      if (sound) {
        layers.push({ ...layer, title: sound.title, artist: sound.artist_name ?? "", startMs: clampSoundStartMs(layer.startMs, sound.duration_ms) });
      }
    } else if (layer.kind === "car") {
      const car = cars.get(layer.vehicleId);
      if (car) layers.push({ ...layer, name: car.name, score: car.score, tier: car.score == null ? null : rankForScore(car.score) });
    } else {
      layers.push(layer);
    }
  }
  return { ...design, layers };
}

export interface StoryCar {
  id: string;
  name: string;
  /** The car's real SORZA score, or null if it hasn't been rated. */
  score: number | null;
  photoUrl: string | null;
}

/** The poster's own cars, for the car sticker. */
export async function myCars(supabase: SupabaseClient<Database>, ownerId: string): Promise<Map<string, StoryCar>> {
  const vehicles = await listVehiclesByOwner(supabase, ownerId);
  const builds = await listActiveBuildsByVehicleIds(supabase, vehicles.map((v) => v.id));
  return new Map(
    vehicles.map((v) => [
      v.id,
      {
        id: v.id,
        name: v.nickname || [v.year, v.make, v.model].filter(Boolean).join(" "),
        score: builds.get(v.id)?.ai_rating_score ?? null,
        photoUrl: null,
      },
    ]),
  );
}
