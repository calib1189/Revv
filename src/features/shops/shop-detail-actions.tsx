"use client";

import { useState } from "react";
import {
  recordShopPromotionClickAction,
  recordShopInquiryAction,
  recordShopWebsiteClickAction,
} from "@/features/shops/actions";
import { PinIcon, CheckIcon } from "@/components/ui/icons";

function buildAppleMapsUrl(name: string, lat: number, lng: number): string {
  const params = new URLSearchParams({ q: name, ll: `${lat},${lng}` });
  return `https://maps.apple.com/?${params.toString()}`;
}

/** Same "directions" signal shop-card.tsx's Google Maps link already
 * records — this is the equivalent action on the detail page, just
 * defaulting to Apple Maps (iOS hands off to the native app before this
 * WebView loads anything) with the raw Google Maps link underneath for
 * anyone not on iOS. */
export function DirectionsButton({
  placeId,
  name,
  lat,
  lng,
}: {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
}) {
  return (
    <a
      href={buildAppleMapsUrl(name, lat, lng)}
      onClick={() => recordShopPromotionClickAction(placeId)}
      className="pressable flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 text-[0.9375rem] font-semibold text-accent-foreground"
    >
      <PinIcon className="h-4 w-4" />
      Directions
    </a>
  );
}

/** A lightweight "I'm interested" signal — no message actually gets
 * sent anywhere, this just logs an inquiry event so the shop's Business
 * Analytics can show real interest, not a full contact/messaging
 * feature (there's no way to reach an arbitrary Google-sourced business
 * on SORZA at all). */
export function GetAQuoteButton({ placeId }: { placeId: string }) {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <span className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-success/12 px-4 text-[0.9375rem] font-semibold text-success">
        <CheckIcon className="h-4 w-4" />
        Interest sent
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setSent(true);
        recordShopInquiryAction(placeId);
      }}
      className="pressable glass flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[0.9375rem] font-semibold text-foreground"
    >
      Get a quote
    </button>
  );
}

export function WebsiteLink({ placeId, url }: { placeId: string; url: string }) {
  const hostname = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => recordShopWebsiteClickAction(placeId)}
      className="truncate text-sm text-accent hover:underline"
    >
      {hostname}
    </a>
  );
}
