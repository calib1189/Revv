import { Spinner } from "@/components/ui/spinner";

export default function VehicleLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="aspect-[16/10] w-full animate-pulse bg-surface sm:aspect-[21/9]" />
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <Spinner className="h-6 w-6 text-muted" />
      </div>
    </div>
  );
}
