import type { NextConfig } from "next";

// Routes from the previous version of the site; old links land on the
// homepage. Temporary (307) so these paths can be reused later.
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
