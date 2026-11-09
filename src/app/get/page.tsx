import type { Metadata } from "next";
import { headers } from "next/headers";
import { GetAppPage } from "@/features/landing/get-app-page";
import { detectInAppBrowser } from "@/lib/in-app-browser";
import { isIosUserAgent } from "@/lib/app-store";

export const metadata: Metadata = {
  title: "Get SORZA",
  description: "Get your car rated. Download SORZA on the App Store.",
};

export default async function GetPage() {
  const userAgent = (await headers()).get("user-agent");
  const platform = isIosUserAgent(userAgent) ? "ios" : userAgent && /Android/i.test(userAgent) ? "android" : "other";
  return <GetAppPage inApp={detectInAppBrowser(userAgent)} platform={platform} />;
}
