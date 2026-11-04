/** The genres the Sounds library is browsed by — the styles car edits
 * actually get cut to. Mirrors the check constraint on `sounds.genre`
 * (0096_sounds_genre_credit.sql); a sound with no genre still shows under
 * "All" and in search. */
export const SOUND_GENRES = [
  { id: "phonk", label: "Phonk" },
  { id: "hiphop", label: "Hip-hop & trap" },
  { id: "electronic", label: "Electronic" },
  { id: "synthwave", label: "Synthwave" },
  { id: "rock", label: "Rock" },
  { id: "cinematic", label: "Cinematic" },
  { id: "chill", label: "Chill & lo-fi" },
] as const;

export type SoundGenre = (typeof SOUND_GENRES)[number]["id"];

const GENRE_IDS = new Set<string>(SOUND_GENRES.map((g) => g.id));

export function isSoundGenre(value: unknown): value is SoundGenre {
  return typeof value === "string" && GENRE_IDS.has(value);
}

export function soundGenreLabel(genre: string | null | undefined): string | null {
  return SOUND_GENRES.find((g) => g.id === genre)?.label ?? null;
}
