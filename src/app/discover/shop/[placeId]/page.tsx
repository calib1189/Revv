import Link from "next/link";
import { notFound } from "next/navigation";
import { getShopDetailsAction, recordShopProfileVisitAction } from "@/features/shops/actions";
import { getShopCategory, isShopCategoryId } from "@/lib/shops/categories";
import { SHOP_PROMOTION_TIERS, type ShopPromotionTier } from "@/lib/db/shop-promotions";
import { RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { DirectionsButton, GetAQuoteButton, WebsiteLink } from "@/features/shops/shop-detail-actions";
import { PromoteThisShop } from "@/features/shops/promote-this-shop";
import { ShopAnalyticsSection } from "@/features/shops/shop-analytics-section";
import { BackIcon, StarIcon, PinIcon, GemIcon, WrenchIcon } from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";

const TIER_METAL_COLORS: Record<ShopPromotionTier, string> = {
  standard: RANK_TEXT_COLORS.silver,
  featured: RANK_TEXT_COLORS.gold,
  diamond: RANK_TEXT_COLORS.diamond,
};

export default async function ShopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { placeId } = await params;
  const { category: categoryParam } = await searchParams;

  const response = await getShopDetailsAction(placeId);

  if (response.rateLimited) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Callout tone="danger">
          You&apos;ve searched a lot just now — give it a few minutes and try again.
        </Callout>
      </div>
    );
  }
  if (response.isMock) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Callout tone="muted">Shop lookup isn&apos;t set up yet — check back soon.</Callout>
      </div>
    );
  }
  if (!response.shop) notFound();

  const shop = response.shop;

  try {
    await recordShopProfileVisitAction(shop.placeId);
  } catch {
    // best-effort only
  }

  const categoryId = categoryParam && isShopCategoryId(categoryParam) ? categoryParam : null;
  const category = categoryId ? getShopCategory(categoryId) : null;
  const CategoryIcon = category?.icon ?? WrenchIcon;
  const tierColor = shop.promotionTier ? TIER_METAL_COLORS[shop.promotionTier] : null;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <Link href="/discover" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <BackIcon className="h-4 w-4" />
        Shops near you
      </Link>

      <div className="glass overflow-hidden rounded-2xl">
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-accent">
              <CategoryIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{shop.name}</h1>
                {shop.promotionTier && (
                  <span
                    className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: `${tierColor}26`, color: tierColor! }}
                  >
                    <GemIcon className="h-2.5 w-2.5" />
                    {SHOP_PROMOTION_TIERS[shop.promotionTier].label}
                  </span>
                )}
              </div>
              {category && <p className="text-sm text-muted">{category.label}</p>}

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {shop.rating != null && (
                  <span className="flex items-center gap-1 text-foreground">
                    <StarIcon className="h-3.5 w-3.5 text-accent" />
                    <span className="font-medium">{shop.rating.toFixed(1)}</span>
                    {shop.reviewCount != null && (
                      <span className="text-muted">({shop.reviewCount})</span>
                    )}
                  </span>
                )}
                {shop.isOpenNow != null && (
                  <span className={shop.isOpenNow ? "text-success" : "text-danger"}>
                    {shop.isOpenNow ? "Open now" : "Closed"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {shop.address && (
            <div className="mt-4 flex items-start gap-1.5 text-sm text-muted">
              <PinIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{shop.address}</span>
            </div>
          )}

          {(shop.phoneNumber || shop.websiteUrl) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {shop.phoneNumber && (
                <a href={`tel:${shop.phoneNumber}`} className="text-accent hover:underline">
                  {shop.phoneNumber}
                </a>
              )}
              {shop.websiteUrl && <WebsiteLink placeId={shop.placeId} url={shop.websiteUrl} />}
            </div>
          )}

          <div className="mt-5 flex gap-2.5">
            <DirectionsButton placeId={shop.placeId} name={shop.name} lat={shop.lat} lng={shop.lng} />
            <GetAQuoteButton placeId={shop.placeId} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ShopAnalyticsSection placeId={shop.placeId} />
      </div>

      <div className="mt-6">
        <PromoteThisShop
          placeId={shop.placeId}
          placeName={shop.name}
          currentTier={shop.promotionTier}
          category={categoryId}
        />
      </div>
    </div>
  );
}
