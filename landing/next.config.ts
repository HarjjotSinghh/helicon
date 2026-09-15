import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // One canonical host: www.helicon.sh permanently redirects to helicon.sh.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.helicon.sh" }],
        destination: "https://helicon.sh/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
