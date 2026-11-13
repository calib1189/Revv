"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleSaveAction } from "@/features/feed/actions";
import { BookmarkIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";

export function SaveButton({
  postId,
  initialSaved,
  isAuthenticated,
  iconClassName = "h-5 w-5",
  initialCount,
  className = "",
  countClassName = "text-xs font-medium",
  variant = "default",
}: {
  postId: string;
  initialSaved: boolean;
  isAuthenticated: boolean;
  iconClassName?: string;
  /** Shows a count below the icon when passed — omit to keep the plain
   * icon-only button used in the feed grid card. */
  initialCount?: number;
  className?: string;
  countClassName?: string;
  /** "rail" is the vertical feed's action column: white on video, gold
   * once saved, count underneath. */
  variant?: "default" | "rail";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount ?? 0);
  const [beat, setBeat] = useState(0);
  const [, startTransition] = useTransition();
  const isRail = variant === "rail";

  const icon = isRail ? (
    <span className="flex h-10 w-10 items-center justify-center">
      <BookmarkIcon
        key={beat}
        filled
        className={`h-[26px] w-[26px] transition-colors duration-150 ${saved ? "animate-like-beat text-[#ffd60a]" : "text-white"}`}
      />
    </span>
  ) : (
    <BookmarkIcon className={iconClassName} filled={saved} />
  );
  const countNode =
    initialCount !== undefined && count > 0 ? (
      <span className={isRail ? "numeral text-[0.6875rem] font-semibold leading-none" : countClassName}>
        {formatCompactNumber(count)}
      </span>
    ) : null;
  const railClassName =
    "pressable flex flex-col items-center gap-0.5 text-white [filter:drop-shadow(0_1px_4px_rgb(0_0_0/0.55))]";

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        aria-label="Log in to save"
        className={isRail ? railClassName : `text-muted ${className}`}
      >
        {icon}
        {countNode}
      </Link>
    );
  }

  function handleClick() {
    const wasSaved = saved;
    setSaved(!wasSaved);
    setCount((c) => c + (wasSaved ? -1 : 1));
    if (!wasSaved) setBeat((n) => n + 1);

    startTransition(async () => {
      try {
        await toggleSaveAction(postId, wasSaved);
      } catch {
        setSaved(wasSaved);
        setCount((c) => c + (wasSaved ? 1 : -1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? "Unsave" : "Save"}
      className={
        isRail
          ? railClassName
          : `transition-colors ${saved ? "text-foreground" : "text-muted hover:text-foreground"} ${className}`
      }
    >
      {icon}
      {countNode}
    </button>
  );
}
