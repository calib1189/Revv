import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">Profile not found</h1>
      <p className="text-sm text-muted">This user doesn&apos;t exist.</p>
      <Link href="/feed">
        <Button variant="secondary">Back to feed</Button>
      </Link>
    </div>
  );
}
