/** SORZA's App Store listing (Sorza LLC). No country segment in the URL,
 * so Apple sends each visitor to their own storefront. */
export const APP_STORE_ID = "6814665400";
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

/** Whether a User-Agent is an iPhone, iPad or iPod: the devices that
 * can actually install the app. iPadOS Safari reports itself as a Mac
 * by default, so an iPad on the desktop UA lands on the website instead,
 * which still has the App Store button. */
export function isIosUserAgent(userAgent: string | null): boolean {
  return userAgent != null && /\b(iPhone|iPad|iPod)\b/.test(userAgent);
}
