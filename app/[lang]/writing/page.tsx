import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Island from "@/components/Island";
import WritingList from "@/components/WritingList";
import { DICTIONARIES, hasLocale, pageHref } from "@/lib/i18n";
import { PROFILE, SHARE_IMAGE } from "@/lib/profile";
import { WRITINGS } from "@/lib/writings";

type Params = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = DICTIONARIES[lang];
  // The page's address, like the homepage's title.
  const title = `${new URL(PROFILE.site).host}${pageHref(lang, "/writing")}`;
  return {
    title,
    description: t.writing.description,
    alternates: {
      canonical: pageHref(lang, "/writing"),
      languages: {
        en: pageHref("en", "/writing"),
        es: pageHref("es", "/writing"),
        "x-default": pageHref("en", "/writing"),
      },
    },
    // A page's openGraph replaces the layout's whole, so it names the image
    // and the layout's other preview fields again.
    openGraph: {
      title,
      description: t.writing.description,
      type: "website",
      locale: t.ogLocale,
      url: pageHref(lang, "/writing"),
      images: [SHARE_IMAGE.image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: t.writing.description,
      images: [SHARE_IMAGE.image],
    },
  };
}

export default async function WritingPage({ params }: Params) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = DICTIONARIES[lang].writing;

  return (
    <div className="flex min-h-dvh flex-col items-center px-4">
      {/* The island stays at the top while the list scrolls under its glass. */}
      <header className="sticky top-3 z-[60] mt-3 h-11 w-[13.5rem] shrink-0 md:h-12 md:w-[17rem] lg:top-5 lg:mt-5">
        <Island page="/writing" />
      </header>

      <main className="w-full max-w-4xl pt-12 pb-16 md:pt-16">
        <h1 className="mb-6 text-[15px] text-ink lg:mb-8">{t.title}</h1>

        <WritingList
          lang={lang}
          writings={WRITINGS}
          t={{ all: t.all, filters: t.filters, empty: t.empty }}
        />

        <p className="mt-16 text-center font-mono text-[11px] font-light lg:text-xs">
          <Link
            href={pageHref(lang, "/")}
            className="underline decoration-from-font [text-underline-position:from-font] hover:text-muted"
          >
            {t.back}
          </Link>
        </p>
      </main>
    </div>
  );
}
