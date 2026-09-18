import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { GroupedList, GroupedRow, RowIcon, SectionTitle } from "@/components/ui/grouped-list";
import { createClient } from "@/lib/supabase/server";
import { getShopDetailsAction, recordShopProfileVisitAction } from "@/features/shops/actions";
import { getShopCategory, isShopCategoryId } from "@/lib/shops/categories";
import { SHOP_PROMOTION_TIERS, type ShopPromotionTier } from "@/lib/db/shop-promotions";
import { getBusinessProfileByPlaceId } from "@/lib/db/business-profiles";
import { listBusinessProfileMedia } from "@/lib/db/business-profile-media";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { DirectionsButton, GetAQuoteButton, WebsiteLink } from "@/features/shops/shop-detail-actions";
import { PromoteThisShop } from "@/features/shops/promote-this-shop";
import { ShopAnalyticsSection } from "@/features/shops/shop-analytics-section";
import { PhotoCarousel } from "@/features/feed/photo-carousel";
import { StarIcon, PinIcon, GemIcon, WrenchIcon, VerifiedBadgeIcon, GlobeIcon } from "@/components/ui/icons";
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

  // A claimed, verified business overlays SORZA-native content on top of
  // this Google listing — RLS only ever returns an approved row to a
  // viewer who isn't its owner, so no explicit status check is needed
  // here to keep an unapproved claim from leaking onto the public page.
  // Wrapped in a try/catch, same reasoning as header.tsx's messaging
  // fetch: a not-yet-applied migration for this table shouldn't take
  // down every existing shop page, just leave it showing plain Google
  // data until the migration runs.
  const supabase = await createClient();
  let businessProfile: Awaited<ReturnType<typeof getBusinessProfileByPlaceId>> = null;
  let businessGallery: Awaited<ReturnType<typeof listBusinessProfileMedia>> = [];
  let logoUrl: string | null = null;
  try {
    businessProfile = await getBusinessProfileByPlaceId(supabase, shop.placeId);
    if (businessProfile?.verification_status === "approved") {
      businessGallery = await listBusinessProfileMedia(supabase, businessProfile.id);
      const logoMedia = businessProfile.logo_media_id
        ? await getMediaById(supabase, businessProfile.logo_media_id)
        : null;
      logoUrl = logoMedia ? publicMediaUrl(supabase, logoMedia.storage_path) : null;
    }
  } catch {
    businessProfile = null;
    businessGallery = [];
    logoUrl = null;
  }
  const isVerifiedBusiness = businessProfile?.verification_status === "approved";

  const categoryId = categoryParam && isShopCategoryId(categoryParam) ? categoryParam : null;
  const category = categoryId ? getShopCategory(categoryId) : null;
  const CategoryIcon = category?.icon ?? WrenchIcon;
  const tierColor = shop.promotionTier ? TIER_METAL_COLORS[shop.promotionTier] : null;

  return (
    <PageShell width="2xl">
      <PageHeader back={{ href: "/discover", label: "Shops" }} className="mb-2" />

      {/* App Store-style listing header: icon tile, name, category,
          then the two actions side by side. */}
      <div className="flex items-start gap-4">
        <span className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-foreground/[0.06] text-accent elev-1">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small fixed-size logo, next/image overhead isn't worth it here
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <CategoryIcon className="h-9 w-9" />
          )}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="flex items-center gap-1.5 text-[1.5rem] font-bold leading-tight tracking-[-0.02em]">
            <span className="min-w-0">{shop.name}</span>
            {isVerifiedBusiness && (
              <VerifiedBadgeIcon className="h-5 w-5 flex-shrink-0 text-accent" aria-label="Verified business" />
            )}
          </h1>
          {category && <p className="mt-0.5 text-[0.9375rem] text-muted">{category.label}</p>}
          {shop.promotionTier && (
            <span
              className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide"
              style={{ backgroundColor: `${tierColor}26`, color: tierColor! }}
            >
              <GemIcon className="h-3 w-3" />
              {SHOP_PROMOTION_TIERS[shop.promotionTier].label}
            </span>
          )}
        </div>
      </div>

      {/* Stat strip, like an App Store listing's ratings row. */}
      {(shop.rating != null || shop.isOpenNow != null) && (
        <div className="mt-5 flex items-stretch border-y border-border py-3">
          {shop.rating != null && (
            <div className="min-w-0 flex-1 text-center">
              <p className="numeral text-[1.25rem] leading-none">{shop.rating.toFixed(1)}</p>
              <p className="mt-1.5 flex items-center justify-center gap-0.5 text-[0.75rem] text-muted">
                <StarIcon className="h-3 w-3 text-[#f0cd6e]" />
                {shop.reviewCount != null ? `${shop.reviewCount} reviews` : "Rating"}
              </p>
            </div>
          )}
          {shop.rating != null && shop.isOpenNow != null && <div className="my-1 w-px bg-border" />}
          {shop.isOpenNow != null && (
            <div className="min-w-0 flex-1 text-center">
              <p className={`text-[1rem] font-semibold leading-none ${shop.isOpenNow ? "text-success" : "text-danger"}`}>
                {shop.isOpenNow ? "Open" : "Closed"}
              </p>
              <p className="mt-1.5 text-[0.75rem] text-muted">Right now</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-2.5">
        <DirectionsButton placeId={shop.placeId} name={shop.name} lat={shop.lat} lng={shop.lng} />
        <GetAQuoteButton placeId={shop.placeId} />
      </div>

      {businessGallery.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-[24px] elev-2">
          <PhotoCarousel photos={businessGallery.map((item) => ({ url: publicMediaUrl(supabase, item.media.storage_path) }))} />
        </div>
      )}

      {isVerifiedBusiness && businessProfile?.description && (
        <p className="mt-6 px-1 text-[0.9375rem] leading-relaxed">{businessProfile.description}</p>
      )}

      {(shop.address || shop.phoneNumber || shop.websiteUrl) && (
        <section className="mt-8">
          <SectionTitle>Information</SectionTitle>
          <GroupedList>
            {shop.address && (
              <GroupedRow
                label={shop.address}
                detail="Address"
                icon={
                  <RowIcon color="#ff453a">
                    <PinIcon />
                  </RowIcon>
                }
              />
            )}
            {shop.phoneNumber && (
              <a href={`tel:${shop.phoneNumber}`} className="relative flex min-h-[48px] items-center gap-3 px-4 py-2.5 active:bg-foreground/[0.06]" style={{ "--row-inset": "3.625rem" } as CSSProperties}>
                <RowIcon color="#34c759">
                  <PhoneGlyph />
                </RowIcon>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] text-accent">{shop.phoneNumber}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-muted">Phone</p>
                </div>
              </a>
            )}
            {shop.websiteUrl && (
              <div className="relative flex min-h-[48px] items-center gap-3 px-4 py-2.5" style={{ "--row-inset": "3.625rem" } as CSSProperties}>
                <RowIcon color="#0a84ff">
                  <GlobeIcon />
                </RowIcon>
                <div className="min-w-0 flex-1">
                  <WebsiteLink placeId={shop.placeId} url={shop.websiteUrl} />
                  <p className="mt-0.5 text-[0.8125rem] text-muted">Website</p>
                </div>
              </div>
            )}
          </GroupedList>
        </section>
      )}

      <div className="mt-8">
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
    </PageShell>
  );
}

/** A handset glyph for the phone row — the icon set has no phone icon. */
function PhoneGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z" />
    </svg>
  );
}
