/** The social apps whose built-in browsers SORZA links get opened in. */
export type InAppBrowser = "TikTok" | "Instagram" | "Facebook" | "Snapchat";

/**
 * Which app's built-in browser a User-Agent belongs to, or null for a
 * normal browser. These browsers often won't open the App Store from a
 * web page ("Action can't be completed" in TikTok), so the download page
 * tells their visitors how to get out to Safari or Chrome first.
 */
export function detectInAppBrowser(userAgent: string | null): InAppBrowser | null {
  if (!userAgent) return null;
  if (/TikTok|musical_ly|Bytedance|BytedanceWebview|trill_/i.test(userAgent)) return "TikTok";
  if (/Instagram/i.test(userAgent)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(userAgent)) return "Facebook";
  if (/Snapchat/i.test(userAgent)) return "Snapchat";
  return null;
}
