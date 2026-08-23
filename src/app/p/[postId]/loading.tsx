import { Spinner } from "@/components/ui/spinner";

export default function PostLoading() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-8 sm:px-6">
      <Spinner className="h-6 w-6 text-muted" />
    </div>
  );
}
