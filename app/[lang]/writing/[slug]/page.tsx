import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Island from "@/components/Island";
import PostView from "@/components/PostView";
import ShareButtons from "@/components/ShareButtons";
import { DICTIONARIES, hasLocale, pageHref, type Locale } from "@/lib/i18n";
import { getPublishedPostBySlug } from "@/lib/posts";
import { PROFILE } from "@/lib/profile";
import { LINK_SIZE } from "@/lib/share-image";
import { excerpt, type Post } from "@/lib/writings";

type Params = { params: Promise<{ lang: string; slug: string }> };

// Posts are rendered on their first visit and kept until one is saved
// again (lib/posts.ts), rather than at build time.
export const generateStaticParams = () => [];
export const dynamicParams = true;

const shareQuery = (post: Post, lang: Locale) => `?lang=${lang}&v=${post.version}`;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};
  const path = pageHref(lang, `/writing/${slug}`);
  // The tab shows the address, like every page; link previews show the post.
  const title = `${new URL(PROFILE.site).host}${path}`;
  const description = post.subtitle || excerpt(post.blocks, 180);
  const image = {
    url: `/og/writing/${slug}${shareQuery(post, lang)}`,
    ...LINK_SIZE,
    type: "image/png",
    alt: post.title,
  };
  return {
    title,
    description,
    authors: [{ name: post.author }],
    alternates: {
      canonical: path,
      languages: {
        en: pageHref("en", `/writing/${slug}`),
        es: pageHref("es", `/writing/${slug}`),
        "x-default": pageHref("en", `/writing/${slug}`),
      },
    },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      locale: DICTIONARIES[lang].ogLocale,
      url: path,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [image],
    },
  };
}

export default async function WritingPost({ params }: Params) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();
  const t = DICTIONARIES[lang].writing;
  const share = (
    <ShareButtons
      url={`${PROFILE.site}${pageHref(lang, `/writing/${slug}`)}`}
      title={post.title}
      storyUrl={`/og/writing/${slug}/story${shareQuery(post, lang)}`}
      slug={slug}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col items-center px-4">
      {/* The island stays at the top while the post scrolls under its glass. */}
      <header className="sticky top-3 z-[60] mt-3 h-11 w-[13.5rem] shrink-0 md:h-12 md:w-[17rem] lg:top-5 lg:mt-5">
        <Island page={`/writing/${slug}`} />
      </header>

      <main className="w-full pt-12 pb-16 md:pt-16">
        <PostView
          post={post}
          lang={lang}
          share={share}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href={pageHref(lang, "/writing")}
                className="font-mono text-[11px] font-light underline decoration-from-font [text-underline-position:from-font] hover:text-muted lg:text-xs"
              >
                {t.allWriting}
              </Link>
              {share}
            </div>
          }
        />
      </main>
    </div>
  );
}
