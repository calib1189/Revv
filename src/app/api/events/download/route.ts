import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics/track";
import type { Json } from "@/lib/supabase/database.types";

/** The download page's funnel (features/landing/download-tracker.tsx):
 * a visit, and a tap on a store badge. Sent with sendBeacon so a tap is
 * still recorded as the page hands off to the App Store. Anonymous by
 * design (no user, no IP stored), only these two event names, and only
 * a few short, known fields, so it can't be used to write anything else
 * into the events table. */
const NAMES = new Set(["download_page_view", "download_store_tap"]);
const STRING_FIELDS = ["visit", "platform", "in_app", "store", "source", "referrer"] as const;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!body || typeof body !== "object") return new NextResponse(null, { status: 400 });
  const { name, props } = body as { name?: unknown; props?: Record<string, unknown> };
  if (typeof name !== "string" || !NAMES.has(name)) return new NextResponse(null, { status: 400 });

  const clean: Record<string, Json> = {};
  for (const field of STRING_FIELDS) {
    const value = props?.[field];
    if (typeof value === "string" && value) clean[field] = value.slice(0, 80);
  }
  if (props?.tiktok_ad === true) clean.tiktok_ad = true;

  await trackEvent(await createClient(), null, name, clean);
  return new NextResponse(null, { status: 204 });
}
