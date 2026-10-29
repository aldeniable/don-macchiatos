import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // A time-in photo is a downscaled JPEG of a few hundred kilobytes. The
      // default 1MB covers that, but this leaves room for a phone that encodes
      // heavier than expected rather than failing the clock-in.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
