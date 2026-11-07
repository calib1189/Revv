import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { GroupedList, GroupedRow, RowIcon, SectionTitle } from "@/components/ui/grouped-list";
import { createClient } from "@/lib/supabase/server";
import { getShopDetailsAction, recordShopProfileVisitAction } from "@/features/shops/actions";
import { getShopCategory, isShopCategoryId } from "@/lib/shops/categories";
import {
  SHOP_PROMOTION_DURATION_DAYS,
  SHOP_PROMOTION_TIERS,
  listLiveShopPromotionsForPlace,
  type ShopPromotionTier,
} from "@/lib/db/shop-promotions";
import { AdminCompCard, type LivePromotion } from "@/features/shops/admin-comp-card";
import { getBusinessProfileByPlaceId, type BusinessProfile } from "@/lib/db/business-profiles";
import { getShopPicture, type ShopPicture } from "@/lib/db/shop-pictures";
import { hasPromotedShop } from "@/lib/db/shop-promotion-events";
import { getProfileByUserId, type Profile } from "@/lib/db/profiles";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listShopReviews } from "@/lib/db/shop-reviews";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ShopPictureCard, type ShopPictureMode } from "@/features/shops/shop-picture-card";
import { listBusinessProfileMedia } from "@/lib/db/business-profile-media";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { parseBusinessHours } from "@/lib/shops/hours";
import { summarizeReviews, type ReviewSummary } from "@/lib/shops/reviews";
import { composeReviews, type ReviewEntry } from "@/lib/shops/compose-reviews";
import {
  CallShopButton,
  DirectionsButton,
  MessageShopButton,
  WebsiteLink,
} from "@/features/shops/shop-detail-actions";
import { PromoteThisShop } from "@/features/shops/promote-this-shop";
import { ShopAnalyticsSection } from "@/features/shops/shop-analytics-section";
import { ShopClaimCard, type ShopClaimState } from "@/features/shops/shop-claim-card";
import { ShopHours } from "@/features/shops/shop-hours";
import { ShopReviews, type ReviewViewer } from "@/features/shops/shop-reviews";
import { PhotoCarousel } from "@/features/feed/photo-carousel";
import { Avatar } from "@/features/feed/avatar";
import { StarIcon, PinIcon, GemIcon, WrenchIcon, GlobeIcon, InstagramIcon } from "@/components/ui/icons";
import { VerifiedBadge } from "@/components/ui/verified-badge";
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
  searchParams: Promise<{ category?: string; promoted?: string }>;
}) {
  const { placeId } = await params;
  const { category: categoryParam, promoted } = await searchParams;

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
  const shopPath = `/discover/shop/${encodeURIComponent(shop.placeId)}`;

  try {
    await recordShopProfileVisitAction(shop.placeId);
  } catch {
    // best-effort only
  }

  const supabase = await createClient();
  const viewer = await getCurrentUser();

  // A claimed, verified business overlays SORZA-native content on top of
  // this Google listing. RLS only returns someone else's claim once it's
  // approved; the viewer's own claim comes back whatever its status. Each
  // block below is wrapped so a not-yet-applied migration leaves the page
  // showing plain Google data instead of failing.
  let businessProfile: BusinessProfile | null = null;
  try {
    businessProfile = await getBusinessProfileByPlaceId(supabase, shop.placeId);
  } catch {
    businessProfile = null;
  }
  const isVerifiedBusiness = businessProfile?.verification_status === "approved";
  const verified = isVerifiedBusiness ? businessProfile : null;
  const viewerIsShopOwner = Boolean(verified && viewer && verified.owner_id === viewer.id);

  let businessGallery: Awaited<ReturnType<typeof listBusinessProfileMedia>> = [];
  let logoUrl: string | null = null;
  let coverUrl: string | null = null;
  let shopOwner: Profile | null = null;
  let shopOwnerAvatarUrl: string | null = null;
  if (verified) {
    const [gallery, logoMedia, coverMedia, owner] = await Promise.all([
      listBusinessProfileMedia(supabase, verified.id).catch(() => []),
      verified.logo_media_id ? getMediaById(supabase, verified.logo_media_id).catch(() => null) : null,
      verified.cover_media_id ? getMediaById(supabase, verified.cover_media_id).catch(() => null) : null,
      getProfileByUserId(supabase, verified.owner_id).catch(() => null),
    ]);
    businessGallery = gallery;
    logoUrl = logoMedia ? publicMediaUrl(supabase, logoMedia.storage_path) : null;
    coverUrl = coverMedia ? publicMediaUrl(supabase, coverMedia.storage_path) : null;
    shopOwner = owner;
    if (owner?.avatar_media_id) {
      const avatar = await getMediaById(supabase, owner.avatar_media_id).catch(() => null);
      shopOwnerAvatarUrl = avatar ? publicMediaUrl(supabase, avatar.storage_path) : null;
    }
  }
  // ?? fallbacks: these columns only exist once 0101 is applied.
  const services = verified?.services ?? [];
  const hours = parseBusinessHours(verified?.hours ?? null);
  const phone = verified?.phone ?? shop.phoneNumber;
  const websiteUrl = verified?.website_url ?? shop.websiteUrl;
  const instagram = verified?.instagram ?? null;

  // The picture a promoter added (0093).
  let shopPicture: ShopPicture | null = null;
  let shopPictureUrl: string | null = null;
  let picturesAvailable = true;
  try {
    shopPicture = await getShopPicture(supabase, shop.placeId);
    const pictureMedia = shopPicture ? await getMediaById(supabase, shopPicture.media_id) : null;
    shopPictureUrl = pictureMedia ? publicMediaUrl(supabase, pictureMedia.storage_path) : null;
  } catch {
    picturesAvailable = false;
  }
  // A verified business's own logo already fills this spot, so picture
  // options only appear when there isn't one.
  const headerPictureUrl = logoUrl ?? shopPictureUrl;
  const pictureOpen = picturesAvailable && !logoUrl;

  let viewerHasPromoted = false;
  let viewerIsAdmin = false;
  if (viewer) {
    [viewerHasPromoted, viewerIsAdmin] = await Promise.all([
      pictureOpen ? hasPromotedShop(supabase, shop.placeId) : Promise.resolve(false),
      getProfileByUserId(supabase, viewer.id)
        .then((profile) => Boolean(profile?.is_admin))
        .catch(() => false),
    ]);
  }

  // What's already running here, for the admin's free-promotion card.
  let livePromotions: LivePromotion[] = [];
  if (viewerIsAdmin) {
    livePromotions = await listLiveShopPromotionsForPlace(supabase, shop.placeId)
      .then((rows) =>
        rows.map((p) => ({ id: p.id, tier: p.tier, endsAt: p.ends_at!, comped: Boolean(p.comped_by) })),
      )
      .catch(() => []);
  }

  const pictureMode: ShopPictureMode | null =
    !viewer || !pictureOpen
      ? null
      : shopPicture
        ? shopPicture.owner_id === viewer.id
          ? "owner"
          : viewerIsAdmin
            ? "admin"
            : null
        : viewerHasPromoted
          ? "add"
          : null;
  // A first-time promoter picks it in the Promote card; anyone who has
  // promoted before can already add one from ShopPictureCard, no payment.
  const offerPictureWithPromotion =
    viewer && pictureOpen && !shopPicture && !viewerHasPromoted ? viewer.id : null;

  // SORZA reviews (0102). Hidden entirely until that migration exists.
  let reviewsAvailable = true;
  let reviews: ReviewEntry[] = [];
  let reviewSummary: ReviewSummary = summarizeReviews([]);
  try {
    const rows = await listShopReviews(supabase, shop.placeId);
    reviewSummary = summarizeReviews(rows.map((r) => r.rating));
    reviews = await composeReviews(supabase, rows);
  } catch {
    reviewsAvailable = false;
  }
  let reviewViewer: ReviewViewer | null = null;
  if (viewer && reviewsAvailable) {
    const garage = await listVehiclesByOwner(supabase, viewer.id).catch(() => []);
    reviewViewer = {
      id: viewer.id,
      isOwner: viewerIsShopOwner,
      garage: garage.map((v) => ({ id: v.id, title: v.nickname || `${v.year} ${v.make} ${v.model}` })),
    };
  }

  const claimState: ShopClaimState | null = !viewer
    ? isVerifiedBusiness
      ? null
      : { kind: "anon" }
    : businessProfile && businessProfile.owner_id === viewer.id
      ? { kind: "own", businessProfileId: businessProfile.id, status: businessProfile.verification_status }
      : isVerifiedBusiness
        ? null
        : { kind: "claimable" };

  const categoryId = categoryParam && isShopCategoryId(categoryParam) ? categoryParam : null;
  const category = categoryId ? getShopCategory(categoryId) : null;
  const CategoryIcon = category?.icon ?? WrenchIcon;
  const tierColor = shop.promotionTier ? TIER_METAL_COLORS[shop.promotionTier] : null;
  const subtitle = verified?.tagline ?? category?.label ?? null;
  const showMessage = Boolean(verified && !viewerIsShopOwner);

  return (
    <PageShell width="2xl">
      <PageHeader back={{ href: "/discover", label: "Shops" }} className="mb-2" />

      {promoted && (
        <div className="mb-5">
          <Callout tone="muted">
            Payment received. {shop.name} is promoted for {SHOP_PROMOTION_DURATION_DAYS} days.
            It can take a moment to show up here.
          </Callout>
        </div>
      )}

      {coverUrl && (
        <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-[24px] bg-foreground/[0.06] elev-2">
          <Image src={coverUrl} alt="" fill priority sizes="(min-width: 768px) 672px, 100vw" className="object-cover" />
        </div>
      )}

      {/* App Store-style listing header: icon tile, name, tagline. */}
      <div className="flex items-start gap-4">
        <span className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-foreground/[0.06] text-accent elev-1">
          {headerPictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small fixed-size logo, next/image overhead isn't worth it here
            <img src={headerPictureUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <CategoryIcon className="h-9 w-9" />
          )}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="flex items-center gap-1.5 text-[1.5rem] font-bold leading-tight tracking-[-0.02em]">
            <span className="min-w-0">{shop.name}</span>
            {isVerifiedBusiness && <VerifiedBadge className="h-5 w-5" label="Verified business" />}
          </h1>
          {subtitle && <p className="mt-0.5 text-[0.9375rem] leading-snug text-muted">{subtitle}</p>}
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
      {(reviewSummary.average !== null || shop.rating != null || shop.isOpenNow != null) && (
        <div className="mt-5 flex items-stretch border-y border-border py-3">
          {reviewSummary.average !== null && (
            <StatCell
              value={reviewSummary.average.toFixed(1)}
              label={`${reviewSummary.count} on SORZA`}
              star
            />
          )}
          {shop.rating != null && (
            <StatCell
              value={shop.rating.toFixed(1)}
              label={shop.reviewCount != null ? `${shop.reviewCount} on Google` : "Google"}
              star
              divider={reviewSummary.average !== null}
            />
          )}
          {shop.isOpenNow != null && (
            <StatCell
              value={shop.isOpenNow ? "Open" : "Closed"}
              valueClassName={shop.isOpenNow ? "text-success" : "text-danger"}
              label="Right now"
              divider={reviewSummary.average !== null || shop.rating != null}
            />
          )}
        </div>
      )}

      <div className="mt-5 flex gap-2.5">
        <DirectionsButton placeId={shop.placeId} name={shop.name} lat={shop.lat} lng={shop.lng} />
        {showMessage && verified ? (
          <MessageShopButton placeId={shop.placeId} ownerId={verified.owner_id} />
        ) : (
          phone && !viewerIsShopOwner && <CallShopButton placeId={shop.placeId} phone={phone} />
        )}
      </div>

      {claimState?.kind === "own" && (
        <div className="mt-6">
          <ShopClaimCard
            placeId={shop.placeId}
            placeName={shop.name}
            placeAddress={shop.address ?? null}
            state={claimState}
          />
        </div>
      )}

      {businessGallery.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-[24px] elev-2">
          <PhotoCarousel photos={businessGallery.map((item) => ({ url: publicMediaUrl(supabase, item.media.storage_path) }))} />
        </div>
      )}

      {verified?.description && (
        <p className="mt-6 whitespace-pre-line px-1 text-[0.9375rem] leading-relaxed">{verified.description}</p>
      )}

      {shopOwner && (
        <Link
          href={`/u/${shopOwner.username}`}
          className="pressable glass-raised elev-1 mt-6 flex items-center gap-3 rounded-[22px] px-4 py-3"
        >
          <Avatar username={shopOwner.username} avatarUrl={shopOwnerAvatarUrl} className="h-11 w-11 text-base" />
          <div className="min-w-0 flex-1">
            <p className="text-[0.75rem] text-muted">Run by</p>
            <p className="flex items-center gap-1 truncate text-[0.9375rem] font-semibold">
              @{shopOwner.username}
              {shopOwner.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
            </p>
          </div>
          <span className="text-[0.8125rem] font-medium text-muted">View profile</span>
        </Link>
      )}

      {services.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Services</SectionTitle>
          <ul className="flex flex-wrap gap-2 px-1">
            {services.map((service) => (
              <li key={service} className="rounded-full bg-foreground/[0.07] px-3.5 py-1.5 text-[0.875rem] font-medium">
                {service}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hours && (
        <section className="mt-8">
          <SectionTitle>Hours</SectionTitle>
          <ShopHours hours={hours} />
        </section>
      )}

      {(shop.address || phone || websiteUrl || instagram) && (
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
            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="relative flex min-h-[48px] items-center gap-3 px-4 py-2.5 active:bg-foreground/[0.06]"
                style={{ "--row-inset": "3.625rem" } as CSSProperties}
              >
                <RowIcon color="#34c759">
                  <PhoneGlyph />
                </RowIcon>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] text-accent">{phone}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-muted">Phone</p>
                </div>
              </a>
            )}
            {websiteUrl && (
              <div className="relative flex min-h-[48px] items-center gap-3 px-4 py-2.5" style={{ "--row-inset": "3.625rem" } as CSSProperties}>
                <RowIcon color="#0a84ff">
                  <GlobeIcon />
                </RowIcon>
                <div className="min-w-0 flex-1">
                  <WebsiteLink placeId={shop.placeId} url={websiteUrl} />
                  <p className="mt-0.5 text-[0.8125rem] text-muted">Website</p>
                </div>
              </div>
            )}
            {instagram && (
              <a
                href={`https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex min-h-[48px] items-center gap-3 px-4 py-2.5 active:bg-foreground/[0.06]"
                style={{ "--row-inset": "3.625rem" } as CSSProperties}
              >
                <RowIcon color="#d6249f">
                  <InstagramIcon />
                </RowIcon>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] text-accent">@{instagram}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-muted">Instagram</p>
                </div>
              </a>
            )}
          </GroupedList>
        </section>
      )}

      {reviewsAvailable && (
        <div className="mt-10">
          <ShopReviews
            placeId={shop.placeId}
            shopName={shop.name}
            summary={reviewSummary}
            reviews={reviews}
            viewer={reviewViewer}
            services={services}
            loginHref={`/login?next=${encodeURIComponent(shopPath)}`}
          />
        </div>
      )}

      {claimState && claimState.kind !== "own" && (
        <div className="mt-10">
          <ShopClaimCard
            placeId={shop.placeId}
            placeName={shop.name}
            placeAddress={shop.address ?? null}
            state={claimState}
          />
        </div>
      )}

      {pictureMode && viewer && (
        <div className="mt-8">
          <ShopPictureCard
            placeId={shop.placeId}
            placeName={shop.name}
            userId={viewer.id}
            pictureUrl={shopPictureUrl}
            mode={pictureMode}
          />
        </div>
      )}

      <div className="mt-8">
        <ShopAnalyticsSection placeId={shop.placeId} />
      </div>

      {/* #promote is where the iOS app's Promote button lands someone on
          the website (see PromoteThisShop), so it's here in the server
          HTML even before that card renders. */}
      <div id="promote" className="mt-6 scroll-mt-20">
        <PromoteThisShop
          placeId={shop.placeId}
          placeName={shop.name}
          currentTier={shop.promotionTier}
          category={categoryId}
          pictureUploaderId={offerPictureWithPromotion}
        />
      </div>

      {viewerIsAdmin && (
        <div className="mt-6">
          <AdminCompCard
            placeId={shop.placeId}
            placeName={shop.name}
            category={categoryId}
            livePromotions={livePromotions}
          />
        </div>
      )}
    </PageShell>
  );
}

function StatCell({
  value,
  label,
  star = false,
  divider = false,
  valueClassName = "",
}: {
  value: string;
  label: string;
  star?: boolean;
  divider?: boolean;
  valueClassName?: string;
}) {
  return (
    <>
      {divider && <div className="my-1 w-px bg-border" />}
      <div className="min-w-0 flex-1 text-center">
        <p className={`numeral text-[1.25rem] leading-none ${valueClassName}`}>{value}</p>
        <p className="mt-1.5 flex items-center justify-center gap-0.5 text-[0.75rem] text-muted">
          {star && <StarIcon className="h-3 w-3 text-[#f0cd6e]" />}
          {label}
        </p>
      </div>
    </>
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
