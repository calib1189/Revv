import Link from "next/link";
import type { ReactNode } from "react";
import { CompassIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

/** The one "doesn't exist" screen, used by every not-found.tsx. */
export function NotFoundState({
  title = "Wrong turn",
  body = "This page doesn't exist, or it moved.",
  icon = <CompassIcon />,
  href = "/feed",
  cta = "Back to Feed",
}: {
  title?: string;
  body?: string;
  icon?: ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/12 text-accent [&>svg]:h-7 [&>svg]:w-7">
        {icon}
      </span>
      <h1 className="mt-5 text-[1.375rem] font-bold tracking-[-0.02em]">{title}</h1>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{body}</p>
      <Link href={href} className="mt-6">
        <Button className="h-11 px-6 text-[0.9375rem] font-semibold">{cta}</Button>
      </Link>
    </div>
  );
}
