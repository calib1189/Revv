"use client";

import { useState, useTransition } from "react";
import { startConversationAction } from "@/features/messages/actions";
import {
  recordShopPromotionClickAction,
  recordShopInquiryAction,
  recordShopWebsiteClickAction,
} from "@/features/shops/actions";
import { PinIcon } from "@/components/ui/icons";

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

/** A claimed shop's real contact button: opens a DM with the verified
 * owner, and counts as an inquiry in their analytics. */
export function MessageShopButton({ placeId, ownerId }: { placeId: string; ownerId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-1 flex-col">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            recordShopInquiryAction(placeId);
            const result = await startConversationAction(ownerId);
            if (result?.error) setError(result.error);
          })
        }
        className="pressable glass flex h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-[0.9375rem] font-semibold text-foreground disabled:opacity-60"
      >
        {isPending ? "Opening…" : "Message shop"}
      </button>
      {error && <p className="mt-1 text-center text-xs text-danger">{error}</p>}
    </div>
  );
}

/** An unclaimed shop has no one on SORZA to message, so the second button
 * calls its listed number instead. Still counts as an inquiry. */
export function CallShopButton({ placeId, phone }: { placeId: string; phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
      onClick={() => recordShopInquiryAction(placeId)}
      className="pressable glass flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[0.9375rem] font-semibold text-foreground"
    >
      Call
    </a>
  );
}
