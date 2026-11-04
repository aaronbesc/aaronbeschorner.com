// The writing page: its categories and the posts filed under them.

import type { Locale } from "./i18n";

/** A topic inside a category, such as Venezuela inside Politics. */
export type Topic = { id: string; label: Record<Locale, string> };

/** A top-level category, with the topics it groups. */
export type Category = { id: string; label: Record<Locale, string>; topics: Topic[] };

const both = (label: string): Record<Locale, string> => ({ en: label, es: label });

export const CATEGORIES: Category[] = [
  {
    id: "politics",
    label: { en: "politics", es: "política" },
    topics: [
      { id: "international", label: { en: "international", es: "internacional" } },
      { id: "venezuela", label: both("venezuela") },
      { id: "spain", label: { en: "spain", es: "españa" } },
      { id: "us", label: { en: "us", es: "ee. uu." } },
    ],
  },
  {
    id: "technology",
    label: { en: "technology", es: "tecnología" },
    topics: [
      { id: "ai", label: { en: "ai", es: "ia" } },
      { id: "data", label: { en: "data", es: "datos" } },
      { id: "engineering", label: { en: "engineering", es: "ingeniería" } },
    ],
  },
  {
    id: "personal",
    label: both("personal"),
    topics: [
      { id: "growth", label: { en: "growth", es: "crecimiento" } },
      { id: "life", label: { en: "life", es: "vida" } },
    ],
  },
  {
    id: "culture",
    label: { en: "culture", es: "cultura" },
    topics: [
      { id: "fashion", label: { en: "fashion", es: "moda" } },
      { id: "music", label: { en: "music", es: "música" } },
    ],
  },
];

export type Writing = {
  slug: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  category: Category["id"];
  topic: Topic["id"];
};

// PLACEHOLDERS: sample entries so the layout can be seen. Replace them with
// real posts (newest first is not required; the page sorts by date).
export const WRITINGS: Writing[] = [
  { slug: "pipelines-that-dont-wake-you-up", title: "Pipelines That Don't Wake You Up", date: "2026-10-28", category: "technology", topic: "data" },
  { slug: "venezuela-after-the-vote", title: "Venezuela, After the Vote", date: "2026-10-14", category: "politics", topic: "venezuela" },
  { slug: "the-runway-as-a-dataset", title: "The Runway as a Dataset", date: "2026-09-30", category: "culture", topic: "fashion" },
  { slug: "agents-need-boring-infrastructure", title: "Agents Need Boring Infrastructure", date: "2026-09-12", category: "technology", topic: "ai" },
  { slug: "a-year-in-madrid", title: "A Year in Madrid", date: "2026-08-21", category: "personal", topic: "life" },
  { slug: "what-spain-gets-right-about-trains", title: "What Spain Gets Right About Trains", date: "2026-07-03", category: "politics", topic: "spain" },
  { slug: "soundcloud-sets-on-loop", title: "SoundCloud Sets on Loop", date: "2026-06-10", category: "culture", topic: "music" },
];

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id);
export const topicOf = (category: string, topic: string) =>
  categoryOf(category)?.topics.find((t) => t.id === topic);
