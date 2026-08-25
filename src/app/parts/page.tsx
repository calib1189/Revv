import { PartsBrowser } from "@/features/parts/parts-browser";

export default function PartsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Parts</h1>
      <p className="mb-8 text-sm text-muted">
        Browse the verified parts catalog, organized by category — every
        area of the car, plus merch. A category without verified parts yet
        still gets you shopping: its &ldquo;Shop now&rdquo; link searches a
        real retailer for it.
      </p>
      <PartsBrowser />
    </div>
  );
}
