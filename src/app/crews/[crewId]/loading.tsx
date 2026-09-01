import { Spinner } from "@/components/ui/spinner";

export default function CrewLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Spinner className="h-6 w-6 text-muted" />
    </div>
  );
}
