import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.178"],
  // Category pages renamed on 15.11.2026 (saffron first in the URL).
  async redirects() {
    return [
      { source: "/kozmetika-za-kosa", destination: "/kozmetika-s-shafran-za-kosa", permanent: true },
      { source: "/kozmetika-za-tyalo", destination: "/kozmetika-s-shafran-za-tyalo", permanent: true },
      { source: "/en/hair-care", destination: "/en/saffron-hair-care", permanent: true },
      { source: "/en/body-care", destination: "/en/saffron-body-care", permanent: true },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
