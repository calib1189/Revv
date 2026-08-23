import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VehicleNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">Vehicle not found</h1>
      <p className="text-sm text-muted">
        This vehicle doesn&apos;t exist or was removed.
      </p>
      <Link href="/garage">
        <Button variant="secondary">Back to garage</Button>
      </Link>
    </div>
  );
}
