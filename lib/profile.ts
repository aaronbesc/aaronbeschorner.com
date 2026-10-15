// Who this site is about, shared by the page, the island and the social
// previews. Text that changes with the language is in lib/i18n.ts.
export const PROFILE = {
  name: "Aaron Beschorner",
  site: "https://aaronbeschorner.com",
  email: "aaronbeschorner@gmail.com",
  github: "aaronbesc",
  linkedin: "https://www.linkedin.com/in/aaron-beschorner/",
  x: "aaronbeschorner",
  source: "https://github.com/aaronbesc/my_portfolio",
};

// The preview shown when a page is shared, drawn by app/opengraph-image.tsx.
// The root layout is per language (app/[lang]), so pages don't pick that
// file up on their own: their metadata links it with this.
const TAGLINE = "data + ai + design";
export const SHARE_IMAGE = {
  tagline: TAGLINE,
  image: {
    // Bump v when the design changes: LinkedIn, WhatsApp and the rest cache
    // previews by URL, so a new one makes them fetch the image again.
    url: "/opengraph-image?v=2",
    width: 1200,
    height: 630,
    type: "image/png",
    alt: `${PROFILE.name}, ${TAGLINE}`,
  },
};
