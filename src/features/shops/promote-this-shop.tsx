"use client";

import { useRef, useState } from "react";
import { createShopPromotionAction } from "@/features/shops/actions";
import { uploadShopPicture } from "@/features/shops/upload-shop-picture";
import { WebHandoffButton } from "@/features/auth/web-handoff-button";
import { useIsNative } from "@/lib/native/use-is-native";
import { SITE_URL } from "@/lib/site-url";
import {
  SHOP_PROMOTION_TIERS,
  SHOP_PROMOTION_TIER_RANK,
  SHOP_PROMOTION_DURATION_DAYS,
  type ShopPromotionTier,
} from "@/lib/db/shop-promotions";
import { TierPicker, type TierMetal } from "@/components/ui/tier-picker";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const TIER_ORDER: ShopPromotionTier[] = ["standard", "featured", "diamond"];
const TIER_METALS: Record<ShopPromotionTier, TierMetal> = {
  standard: "silver",
  featured: "gold",
  diamond: "diamond",
};

function nextWorthwhileTier(
  current: ShopPromotionTier | null,
): ShopPromotionTier {
  const currentRank = current ? SHOP_PROMOTION_TIER_RANK[current] : 0;
  return (
    TIER_ORDER.find((t) => SHOP_PROMOTION_TIER_RANK[t] > currentRank) ??
    "diamond"
  );
}

/** The one place a shop gets promoted: on its own page. "Promote your
 * shop" (promote-shop-panel.tsx) only finds the shop and sends people
 * here, so the plan and the optional profile picture are chosen in one
 * form, right where the picture will show. */
export function PromoteThisShop({
  placeId,
  placeName,
  currentTier,
  category,
  pictureUploaderId,
}: {
  placeId: string;
  placeName: string;
  currentTier: ShopPromotionTier | null;
  /** The category this shop was browsed under to reach this page, if
   * any — captured so the promotion guarantees visibility in that
   * specific category browse (see searchNearbyShopsAction). Null when
   * this page was reached some other way (a direct link, a Details-page
   * revisit with no category in the URL). */
  category: string | null;
  /** The signed-in user's id when this promotion can come with a profile
   * picture: the shop has none yet and they've never promoted it (past
   * promoters add one from ShopPictureCard instead). Null hides it. */
  pictureUploaderId: string | null;
}) {
  const [tier, setTier] = useState<ShopPromotionTier>(
    nextWorthwhileTier(currentTier),
  );
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picture, setPicture] = useState<{ mediaId: string; url: string } | null>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const isNative = useIsNative();

  if (currentTier === "diamond") {
    return (
      <p className="glass-raised elev-1 rounded-[22px] p-4 text-center text-[0.875rem] text-muted">
        {placeName} already has the top Diamond spot.
      </p>
    );
  }

  // Waits for the platform check rather than flashing the priced web
  // version inside the app. This sits at the bottom of the page, so
  // appearing a moment late goes unseen.
  if (isNative === null) return null;

  // See createWebHandoffAction's doc comment — native never shows plans,
  // prices or a checkout. It sends the person to this same shop's page
  // on the website, signed in and scrolled to this card (the page wraps
  // it in #promote), where they pick a plan and pay.
  if (isNative) {
    return (
      <div className="glass-raised elev-1 flex flex-col gap-4 rounded-[22px] p-5">
        <div>
          <h2 className="text-sm font-semibold">Promote {placeName}</h2>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
            Promoted shops sort above the rest when people browse Shops.
          </p>
        </div>
        <WebHandoffButton
          nextPath={`/discover/shop/${encodeURIComponent(placeId)}${category ? `?category=${encodeURIComponent(category)}` : ""}#promote`}
          label="Promote on the website"
          note={`Opens this shop on ${SITE_HOST}, already signed in.`}
          prepareWhen="visible"
        />
      </div>
    );
  }

  // Uploaded as soon as it's picked, so a photo the moderation check
  // refuses is caught here rather than after paying.
  async function handlePictureFile(file: File) {
    if (!pictureUploaderId) return;
    setPictureError(null);
    setIsUploadingPicture(true);
    const upload = await uploadShopPicture(pictureUploaderId, file);
    setIsUploadingPicture(false);
    if ("error" in upload) {
      setPictureError(upload.error);
      return;
    }
    setPicture(upload);
  }

  async function handlePromote() {
    setError(null);
    setIsPromoting(true);
    try {
      const result = await createShopPromotionAction({
        placeId,
        placeName,
        tier,
        category,
        pictureMediaId: picture?.mediaId ?? null,
      });
      if (result.error || !result.url) {
        setError(result.error ?? "Couldn't start checkout. Try again.");
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Couldn't start checkout. Try again.");
    } finally {
      setIsPromoting(false);
    }
  }

  return (
    <div className="glass-raised elev-1 flex flex-col gap-3 rounded-[22px] p-5">
      <h2 className="text-sm font-semibold">Promote {placeName}</h2>
      {error && <Callout tone="danger">{error}</Callout>}
      <TierPicker
        name="promote-this-shop-tier"
        value={tier}
        onChange={(id) => setTier(id as ShopPromotionTier)}
        options={TIER_ORDER.map((t) => {
          const alreadyActive =
            !!currentTier &&
            SHOP_PROMOTION_TIER_RANK[t] <=
              SHOP_PROMOTION_TIER_RANK[currentTier];
          return {
            id: t,
            metal: TIER_METALS[t],
            priceCents: SHOP_PROMOTION_TIERS[t].priceCents,
            subtitle:
              t === "diamond"
                ? `Top-tier placement, ${SHOP_PROMOTION_DURATION_DAYS} days — sorts above every Gold and Silver listing`
                : t === "featured"
                  ? `${SHOP_PROMOTION_DURATION_DAYS} days — sorts above Silver listings`
                  : `${SHOP_PROMOTION_DURATION_DAYS} days — sorts above un-promoted shops`,
            disabled: alreadyActive,
            disabledReason: alreadyActive
              ? "Already active or below"
              : undefined,
          };
        })}
      />
      {pictureUploaderId && (
        <div className="flex items-center gap-3 rounded-[18px] bg-foreground/[0.04] p-3">
          <button
            type="button"
            onClick={() => pictureInputRef.current?.click()}
            disabled={isUploadingPicture || isPromoting}
            aria-label={picture ? "Change profile picture" : "Add a profile picture"}
            className="pressable flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-foreground/[0.07] text-muted"
          >
            {isUploadingPicture ? (
              <Spinner className="h-5 w-5" />
            ) : picture ? (
              // eslint-disable-next-line @next/next/no-img-element -- small fixed-size preview, next/image overhead isn't worth it here
              <img src={picture.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <PlusIcon className="h-5 w-5" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[0.875rem] font-semibold">
              Profile picture <span className="font-normal text-muted">· optional</span>
            </p>
            <p className="mt-0.5 text-[0.75rem] leading-snug text-muted">
              {pictureError ? (
                <span className="text-danger">{pictureError}</span>
              ) : (
                "Shows on this shop's page and in Shops, and stays after the promotion ends."
              )}
            </p>
          </div>
          {picture && !isPromoting && (
            <button
              type="button"
              onClick={() => setPicture(null)}
              aria-label="Remove profile picture"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
          <input
            ref={pictureInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePictureFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
      <Button
        type="button"
        onClick={handlePromote}
        disabled={isPromoting || isUploadingPicture}
        className="w-full py-3"
      >
        {isPromoting
          ? "Starting checkout…"
          : `Promote for ${SHOP_PROMOTION_DURATION_DAYS} days · $${(SHOP_PROMOTION_TIERS[tier].priceCents / 100).toFixed(0)}`}
      </Button>
    </div>
  );
}
