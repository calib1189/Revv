import Image from "next/image";

export function Avatar({
  username,
  avatarUrl,
  className = "h-8 w-8 text-sm",
  priority,
}: {
  username: string;
  avatarUrl?: string | null;
  className?: string;
  /** Only worth setting on a large, prominent avatar (a profile header)
   * that's a plausible Largest Contentful Paint candidate — every other
   * usage (comments, feed authors, leaderboard rows) is small enough
   * that lazy-loading is correct, not an oversight. */
  priority?: boolean;
}) {
  if (avatarUrl) {
    return (
      <div className={`relative flex-shrink-0 overflow-hidden rounded-full bg-surface-raised ${className}`}>
        <Image src={avatarUrl} alt="" fill priority={priority} sizes="128px" className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-surface-raised font-medium text-foreground ${className}`}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}
