import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PostNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">Post not found</h1>
      <p className="text-sm text-muted">
        This post doesn&apos;t exist or was removed.
      </p>
      <Link href="/feed">
        <Button variant="secondary">Back to feed</Button>
      </Link>
    </div>
  );
}
