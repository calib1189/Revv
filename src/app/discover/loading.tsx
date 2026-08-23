import { Spinner } from "@/components/ui/spinner";

export default function DiscoverLoading() {
  return (
    <div className="flex h-[calc(100dvh-56px)] items-center justify-center bg-black">
      <Spinner className="h-6 w-6 text-white" />
    </div>
  );
}
