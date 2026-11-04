// The writing section: its categories, and the shape and rules of a post,
// shared by the public pages, the editor (app/admin/writing) and the
// server. The posts themselves live in Postgres (see lib/db.ts) and their
// images in Vercel Blob.

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

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id);
export const topicOf = (category: string, topic: string) =>
  categoryOf(category)?.topics.find((t) => t.id === topic);

/** "politics / venezuela", or just "politics" for a post with no topic. */
export function kicker(post: Pick<Post, "category" | "topic">, lang: Locale) {
  const category = categoryOf(post.category);
  const topic = topicOf(post.category, post.topic);
  return [category?.label[lang], topic?.label[lang]].filter(Boolean).join(" / ");
}

/** An uploaded image, with its size so pages can lay it out before it loads. */
export type PostImage = { url: string; width: number; height: number; alt: string };

/**
 * A piece of a post's body: Markdown text, or a row of images. A wide row
 * is set wider than the text on large screens.
 */
export type Block =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "images"; images: PostImage[]; caption: string; wide: boolean };

export type Post = {
  id: number;
  /** The post's address: /writing/<slug>. */
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  /** YYYY-MM-DD */
  date: string;
  category: string;
  /** One of the category's topics, or "" for none. */
  topic: string;
  /** The wide image under the title, or null. */
  cover: PostImage | null;
  blocks: Block[];
  published: boolean;
  /** Changes on every save; versions the share images' URLs. */
  version: string;
};

/** What the editor sends to be saved. */
export type PostInput = Omit<Post, "id" | "version">;

/** A post in a list, without its body. */
export type PostSummary = Omit<Post, "blocks" | "cover">;

/** Image types the uploader accepts, and how big one can be. */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/** Limits, so a stray paste can't fill the database. */
export const LIMITS = {
  slug: 100,
  title: 200,
  subtitle: 300,
  author: 100,
  alt: 300,
  caption: 300,
  text: 50_000,
  blocks: 200,
  imagesPerBlock: 12,
};

/** "¿Qué pasa en España?" → "que-pasa-en-espana" */
export function slugify(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, LIMITS.slug)
    .replace(/-+$/, "");
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const BLOCK_ID = /^[\w-]{1,40}$/;

/** Only images in the site's Vercel Blob store, so a post can't embed anything else. */
export function isBlobUrl(url: string) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/i.test(hostname);
  } catch {
    return false;
  }
}

const isSize = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0 && (n as number) <= 30_000;

function cleanImage(value: unknown): PostImage | null {
  if (!value || typeof value !== "object") return null;
  const { url, width, height, alt } = value as Record<string, unknown>;
  if (typeof url !== "string" || !isBlobUrl(url)) return null;
  if (!isSize(width) || !isSize(height)) return null;
  if (typeof alt !== "string" || alt.length > LIMITS.alt) return null;
  return { url, width, height, alt: alt.trim() };
}

function cleanBlock(value: unknown): Block | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Record<string, unknown>;
  if (typeof block.id !== "string" || !BLOCK_ID.test(block.id)) return null;
  if (block.type === "text") {
    if (typeof block.text !== "string" || block.text.length > LIMITS.text) return null;
    return { id: block.id, type: "text", text: block.text };
  }
  if (block.type === "images") {
    const { images, caption, wide } = block;
    if (!Array.isArray(images) || images.length > LIMITS.imagesPerBlock) return null;
    if (typeof caption !== "string" || caption.length > LIMITS.caption) return null;
    if (typeof wide !== "boolean") return null;
    const clean = images.map(cleanImage);
    if (clean.some((image) => !image)) return null;
    return { id: block.id, type: "images", images: clean as PostImage[], caption: caption.trim(), wide };
  }
  return null;
}

/**
 * Checks a post from the editor and returns it cleaned up, or a message
 * saying what's wrong with it.
 */
export function cleanPost(value: unknown): { post: PostInput } | { error: string } {
  if (!value || typeof value !== "object") return { error: "Invalid post" };
  const input = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const v = input[key];
    return typeof v === "string" && v.trim().length <= max ? v.trim() : null;
  };

  const title = text("title", LIMITS.title);
  if (!title) return { error: "The post needs a title." };
  const subtitle = text("subtitle", LIMITS.subtitle);
  if (subtitle === null) return { error: "The subtitle is too long." };
  const author = text("author", LIMITS.author);
  if (!author) return { error: "The post needs an author." };
  const slug = text("slug", LIMITS.slug);
  if (!slug || !SLUG.test(slug)) {
    return { error: "The address can only have lowercase letters, numbers and dashes." };
  }
  const date = text("date", 10);
  if (!date || !DATE.test(date) || Number.isNaN(Date.parse(date))) {
    return { error: "The date isn't valid." };
  }
  const category = categoryOf(String(input.category));
  if (!category) return { error: "Pick a category." };
  const topic = input.topic === "" ? "" : topicOf(category.id, String(input.topic))?.id;
  if (topic === undefined) return { error: "That topic isn't in the category." };
  if (typeof input.published !== "boolean") return { error: "Invalid post" };

  const cover = input.cover === null ? null : cleanImage(input.cover);
  if (input.cover !== null && !cover) return { error: "The cover image isn't valid." };
  if (!Array.isArray(input.blocks) || input.blocks.length > LIMITS.blocks) {
    return { error: "The post has too many blocks." };
  }
  const blocks = input.blocks.map(cleanBlock);
  if (blocks.some((block) => !block)) return { error: "A block in the post isn't valid." };

  return {
    post: {
      slug,
      title,
      subtitle,
      author,
      date,
      category: category.id,
      topic,
      cover,
      blocks: blocks as Block[],
      published: input.published,
    },
  };
}

/** Every image a post uses: the cover, then the body's. */
export function imagesOf(post: Pick<Post, "cover" | "blocks">) {
  return [
    ...(post.cover ? [post.cover] : []),
    ...post.blocks.flatMap((block) => (block.type === "images" ? block.images : [])),
  ];
}

/** Markdown's inline marks taken out: links keep their text. */
const unmark = (text: string) =>
  text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** The body as plain text, without Markdown's marks, for counting words. */
export function plainText(blocks: Block[]) {
  return blocks
    .filter((block) => block.type === "text")
    .map((block) =>
      unmark(
        block.text
          .replace(/```[\s\S]*?```/g, " ")
          .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, ""),
      ),
    )
    .join(" ")
    .trim();
}

/**
 * The body's prose paragraphs as plain text, for previews: headings,
 * lists, code and dividers are left out, and quotes lose their marks.
 */
export function paragraphs(blocks: Block[]) {
  return blocks
    .filter((block) => block.type === "text")
    .flatMap((block) => block.text.replace(/```[\s\S]*?```/g, "\n\n").split(/\n\s*\n/))
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !/^(#{1,6}\s|[-*+]\s|\d+\.\s|([-*_]\s*){3,}$)/.test(paragraph))
    .map((paragraph) => unmark(paragraph.replace(/^\s{0,3}>\s?/gm, "")))
    .filter(Boolean);
}

/**
 * Cuts text to at most max characters, at the end of a sentence when one
 * ends past halfway, otherwise at a word.
 */
function cut(text: string, max: number) {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const sentence = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "));
  if (sentence > max / 2) return head.slice(0, sentence + 1);
  const space = head.lastIndexOf(" ");
  return (space > 0 ? head.slice(0, space) : head).replace(/[\s,;:-]+$/, "");
}

/** The start of the body's prose, for previews. */
export function excerpt(blocks: Block[], max: number) {
  return cut(paragraphs(blocks).join(" "), max);
}

/** The first paragraphs, up to about max characters in all, the last one cut. */
export function leadParagraphs(blocks: Block[], max: number) {
  const lead: string[] = [];
  let room = max;
  for (const paragraph of paragraphs(blocks)) {
    if (room <= 40) break;
    lead.push(cut(paragraph, room));
    room -= paragraph.length;
  }
  return lead;
}

/** Minutes to read the body, at about 230 words a minute. */
export function readingMinutes(blocks: Block[]) {
  const words = plainText(blocks).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

/** 2026-07-22 → 07-22-26 in English, 22-07-26 in Spanish. */
export function shortDate(iso: string, lang: Locale) {
  const [y, m, d] = iso.split("-");
  const yy = y.slice(2);
  return lang === "en" ? `${m}-${d}-${yy}` : `${d}-${m}-${yy}`;
}

/** 2026-07-22 → "July 22, 2026", or "22 de julio de 2026". */
export function longDate(iso: string, lang: Locale, month: "long" | "short" = "long") {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", {
    day: "numeric",
    month,
    year: "numeric",
    timeZone: "UTC",
  });
}
