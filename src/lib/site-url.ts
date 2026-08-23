/** The canonical production URL. Override via NEXT_PUBLIC_SITE_URL once a
 * custom domain is set up — everything that needs an absolute URL
 * (metadata, robots.txt, sitemap.xml) reads from here so there's one place
 * to update. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://revv-eta.vercel.app";
