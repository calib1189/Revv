import { SearchPanel } from "@/features/search/search-panel";

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="mb-4 text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Search</h1>
      <SearchPanel />
    </div>
  );
}
