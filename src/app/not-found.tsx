import Link from "next/link";
import { CompassIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
        <CompassIcon className="h-7 w-7" />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">Wrong turn</h1>
      <p className="text-sm text-muted">
        This page doesn&apos;t exist, or it moved. Let&apos;s get you back on the road.
      </p>
      <Link href="/feed">
        <Button className="mt-2 px-5">Back to feed</Button>
      </Link>
    </div>
  );
}
