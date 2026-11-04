import type { Sound } from "@/lib/db/sounds";

/** The attribution a Creative Commons track requires: title, artist, the
 * license (linked) and where it was published (linked). Shown wherever a
 * licensed sound has its own page. Nothing for member uploads, which carry
 * no license of ours to state. */
export function SoundCredit({ sound, className = "" }: { sound: Sound; className?: string }) {
  if (sound.source !== "licensed" || !sound.license_label) return null;

  return (
    <p className={`text-[0.75rem] leading-relaxed ${className}`}>
      &ldquo;{sound.title}&rdquo;{sound.artist_name ? ` by ${sound.artist_name}` : ""} ·{" "}
      {sound.license_url ? (
        <a href={sound.license_url} target="_blank" rel="noopener noreferrer license" className="underline underline-offset-2">
          {sound.license_label}
        </a>
      ) : (
        sound.license_label
      )}
      {sound.source_url && (
        <>
          {" · "}
          <a href={sound.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Source
          </a>
        </>
      )}
    </p>
  );
}
