import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SOUND_GENRES, isSoundGenre, soundGenreLabel } from "./genres";

describe("sound genres", () => {
  it("recognises only the listed genres", () => {
    expect(isSoundGenre("phonk")).toBe(true);
    expect(isSoundGenre("Phonk")).toBe(false);
    expect(isSoundGenre("polka")).toBe(false);
    expect(isSoundGenre(null)).toBe(false);
  });

  it("labels a genre, and nothing for none", () => {
    expect(soundGenreLabel("hiphop")).toBe("Hip-hop & trap");
    expect(soundGenreLabel(null)).toBeNull();
    expect(soundGenreLabel("polka")).toBeNull();
  });

  it("matches the database check constraint exactly", () => {
    const sql = readFileSync(
      join(__dirname, "../../../supabase/migrations/0096_sounds_genre_credit.sql"),
      "utf8",
    );
    const list = sql.match(/genre in \(([^)]+)\)/)?.[1] ?? "";
    const ids = [...list.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(ids).toEqual(SOUND_GENRES.map((g) => g.id));
  });
});
