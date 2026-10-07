# Aaron Beschorner — personal site

Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel. Designed in Figma.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # same build Vercel runs
```

Pushing to `main` deploys to production on Vercel.

## Layout

- `app/page.tsx` — the homepage: header, card deck, footer
- `components/Deck.tsx` — the swipeable card stack and its pager
- `components/GoGators.tsx` — the "Go Gators" easter egg (click "University of Florida")
- `lib/` — build-time commit info and Madrid weather (Open-Meteo)
