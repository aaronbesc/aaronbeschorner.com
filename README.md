# Aaron Beschorner — personal site

Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel. Designed in Figma.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # same build Vercel runs
```

Pushing to `main` deploys to production on Vercel.

## Layout

- `app/page.tsx` — the homepage: island, card deck, footer
- `app/globals.css` — light and dark palettes, glass, Go Gators party styles
- `components/Island.tsx` — the pill at the top and its menu (hover, tap or ⌘K / Ctrl K)
- `components/Deck.tsx` — the swipeable card stack and its pager
- `components/SocialLinks.tsx`, `components/Previews.tsx` — social icons and their hover previews
- `components/GoGators.tsx` — the "Go Gators" easter egg (click "University of Florida")
- `lib/profile.ts` — name, links and handles used across the site
- `lib/theme.ts` — light / dark / system preference
- `lib/` — also build-time commit info, Madrid weather (Open-Meteo) and GitHub contributions
