import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // One page, mostly first-time visitors: styles arrive with the HTML instead
  // of blocking the first paint on a separate request.
  experimental: { inlineCss: true },
};

export default nextConfig;
