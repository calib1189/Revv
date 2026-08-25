import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions cap request bodies at 1MB by default — identifyVehicleAction
  // (garage/actions.ts) receives the raw photo as FormData directly, and
  // validateImageFile allows images up to 15MB, so any real phone photo
  // was getting rejected by Next.js itself before ever reaching that
  // action's code. This is almost certainly the actual, longstanding
  // cause of "couldn't identify that photo" for real (non-tiny) images.
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  images: {
    // Next 16 defaults to only allowing quality=75 and silently coerces
    // any other value down to it — the login logo needs 100 to actually
    // apply instead of being quietly re-coerced back to 75.
    qualities: [75, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Amazon product images, once real PA-API results start rendering
      // (get-product-search-provider.ts) — m.media-amazon.com is what
      // PA-API actually returns today; the ssl-images host is kept for
      // any older-format URL that might still show up.
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
    ],
  },
};

export default nextConfig;
