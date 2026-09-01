import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CrewNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">Crew not found</h1>
      <p className="text-sm text-muted">This crew doesn&apos;t exist, or it&apos;s private.</p>
      <Link href="/crews">
        <Button variant="secondary">Back to Crews</Button>
      </Link>
    </div>
  );
}
