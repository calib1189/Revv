import { SearchPanel } from "@/features/search/search-panel";

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Search</h1>
      <SearchPanel />
    </div>
  );
}
