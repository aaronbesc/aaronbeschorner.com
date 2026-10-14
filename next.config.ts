import type { NextConfig } from "next";

// Routes from the previous version of the site; old links land on the
// homepage. Temporary (307) so these paths can be reused later.
const legacyRoutes = ["/about", "/projects", "/contact", "/blog"];

// Pages besides the homepage. English serves them from the root, Spanish
// under /es (see app/[lang]).
const pages = ["/styling"];

const nextConfig: NextConfig = {
  experimental: {
    // The root layout is per language (app/[lang]), so the 404 for URLs
    // that match nothing is its own page: app/global-not-found.tsx.
    globalNotFound: true,
  },
  async redirects() {
    return [
      // English lives at the root, not under /en.
      { source: "/en", destination: "/", permanent: false },
      { source: "/en/:path+", destination: "/:path+", permanent: false },
      ...legacyRoutes.flatMap((route) => [
        { source: route, destination: "/", permanent: false },
        { source: `${route}/:path*`, destination: "/", permanent: false },
      ]),
    ];
  },
  async rewrites() {
    // The root serves the English site (app/[lang] with lang "en").
    return [
      { source: "/", destination: "/en" },
      ...pages.map((page) => ({ source: page, destination: `/en${page}` })),
    ];
  },
};

export default nextConfig;
