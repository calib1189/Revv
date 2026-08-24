import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
