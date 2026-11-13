import { MusicIcon } from "@/components/ui/icons";

function hueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

const SIZES = {
  sm: "h-10 w-10 rounded-[11px]",
  md: "h-12 w-12 rounded-[13px]",
  lg: "h-14 w-14 rounded-[15px]",
  xl: "h-[6.5rem] w-[6.5rem] rounded-[24px]",
} as const;

/** A sound's tile. Sounds carry no artwork, so each gets a quiet tint of
 * its own (stable per sound, from its id) behind a note — enough to tell
 * rows apart at a glance without inventing album art. While a sound is
 * playing the note becomes moving bars. */
export function SoundCover({
  seed,
  playing = false,
  size = "md",
}: {
  seed: string;
  playing?: boolean;
  size?: keyof typeof SIZES;
}) {
  const hue = hueFor(seed);
  return (
    <span
      aria-hidden
      className={`flex flex-shrink-0 items-center justify-center ${SIZES[size]}`}
      style={{
        backgroundColor: `hsl(${hue} 28% 17%)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue} 35% 28%)`,
        color: `hsl(${hue} 70% 74%)`,
      }}
    >
      {playing ? (
        <span className="flex h-[18px] items-end gap-[3px]">
          {[0, 180, 90, 270].map((delay) => (
            <span
              key={delay}
              className="animate-eq-bar block h-full w-[3px] rounded-full bg-current"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      ) : (
        <MusicIcon className="h-[45%] w-[45%]" />
      )}
    </span>
  );
}
