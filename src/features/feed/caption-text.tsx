const HASHTAG_PATTERN = /(#\w+)/g;

/** Renders caption text with #hashtags picked out in accent color. Plain
 * text, no linking/filtering yet — just the visual treatment. */
export function CaptionText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(HASHTAG_PATTERN);

  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="font-medium text-accent">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}
