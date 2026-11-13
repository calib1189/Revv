"use client";

import { useStories } from "@/features/stories/story-viewer-provider";

/**
 * The ring around an avatar whose owner has a story up: solid SORZA red
 * while there's something you haven't watched, a quiet grey once you're
 * caught up. Tapping it plays their story. With no story it renders the
 * avatar untouched.
 *
 * `gap` is the color between ring and avatar, matching what's behind it
 * (black over video, the page background elsewhere).
 */
export function StoryRing({
  authorId,
  state,
  label,
  gap = "black",
  width = 2.5,
  className = "",
  children,
}: {
  authorId: string;
  state: "unseen" | "seen" | null | undefined;
  /** For screen readers: "@name's story". */
  label: string;
  gap?: string;
  width?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const { openStories, caughtUp } = useStories();
  if (!state) return <>{children}</>;
  const unseen = state === "unseen" && !caughtUp.has(authorId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openStories([authorId], authorId);
      }}
      aria-label={label}
      className={`pressable block rounded-full transition-[background-color] duration-300 ${unseen ? "bg-accent" : "bg-white/30"} ${className}`}
      style={{ padding: width }}
    >
      <span className="block rounded-full" style={{ padding: width - 0.5, backgroundColor: gap }}>
        {children}
      </span>
    </button>
  );
}
