import { PartsBrowser } from "@/features/parts/parts-browser";

export function MarketplacePageContent() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Marketplace</h1>
      <p className="text-sm text-muted">
        Every area of the car, plus merch. A category without verified
        parts yet still gets you shopping — its &ldquo;Shop now&rdquo; link
        searches a real retailer for it.
      </p>
      {/* FTC/Amazon Associates disclosure — required, and placed right
          next to the affiliate links themselves rather than relying on
          the footer's mention alone, since this is the page where they're
          actually concentrated. */}
      <p className="mb-8 mt-1 text-xs text-muted/70">
        As an Amazon Associate, REVV earns from qualifying purchases.
      </p>
      <PartsBrowser />
    </div>
  );
}
