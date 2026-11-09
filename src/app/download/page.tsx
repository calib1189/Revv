import type { Metadata } from "next";
import GetPage from "@/app/get/page";

// The older short link, still in bios, videos and QR codes. It used to
// redirect iPhones straight to the App Store, which TikTok's in-app
// browser blocks ("Action can't be completed"); now it's the same page
// as /get.
export const metadata: Metadata = {
  title: "Get SORZA",
  description: "Get your car rated. Download SORZA on the App Store.",
};

export default GetPage;
