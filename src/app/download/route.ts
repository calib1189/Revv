import { NextResponse, type NextRequest } from "next/server";
import { APP_STORE_URL, isIosUserAgent } from "@/lib/app-store";

/**
 * sorza.net/download: the short link for bios, videos and QR codes at
 * meets. iPhones go straight to the App Store. Everyone else goes to the
 * landing page, which has the App Store button plus web sign-up, because
 * an Android phone can't install the app and would hit a dead end.
 */
export function GET(request: NextRequest) {
  const destination = isIosUserAgent(request.headers.get("user-agent"))
    ? APP_STORE_URL
    : new URL("/", request.url);
  return NextResponse.redirect(destination, 302);
}
