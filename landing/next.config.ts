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
      // Terms people type into the address bar or link to from elsewhere, sent to the page that
      // actually answers them rather than to a 404.
      { source: "/gui", destination: "/muse-code-gui", permanent: true },
      { source: "/desktop", destination: "/muse-code-desktop-app", permanent: true },
      { source: "/app", destination: "/muse-code-desktop-app", permanent: true },
      { source: "/windows", destination: "/install/windows", permanent: true },
      { source: "/mac", destination: "/install/macos", permanent: true },
      { source: "/macos", destination: "/install/macos", permanent: true },
      { source: "/linux", destination: "/install/linux", permanent: true },
      { source: "/wsl", destination: "/install/wsl2", permanent: true },
      { source: "/docs", destination: "/guides", permanent: true },
      { source: "/alternatives", destination: "/compare", permanent: true },
      { source: "/vs/:slug", destination: "/compare/:slug", permanent: true },
      { source: "/releases", destination: "/changelog", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // The machine-readable surfaces are meant to be fetched by tools on other origins.
        source: "/:path(llms.txt|llms-full.txt|agents.md|facts.json|sitemap.xml)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "X-Robots-Tag", value: "index, follow" },
        ],
      },
      {
        source: "/md/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "X-Robots-Tag", value: "index, follow" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
