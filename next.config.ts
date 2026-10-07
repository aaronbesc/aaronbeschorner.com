import type { NextConfig } from "next";

// Old routes from the previous site. Temporary (307) so nothing gets cached
// permanently while the new site is being built.
const legacyRoutes = ["/about", "/projects", "/contact", "/blog", "/mdx-test"];

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRoutes.flatMap((route) => [
      { source: route, destination: "/", permanent: false },
      { source: `${route}/:path*`, destination: "/", permanent: false },
    ]);
  },
};

export default nextConfig;
