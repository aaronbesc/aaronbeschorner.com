import type { Metadata } from "next";
import { Arimo } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Island from "@/components/Island";
import { EDITORIALS, pagesOf, type Editorial, type Shot } from "@/lib/editorials";
import { DICTIONARIES, hasLocale, pageHref, type Locale } from "@/lib/i18n";
import { PROFILE, SHARE_IMAGE } from "@/lib/profile";

// The magazine titles are set in Helvetica Neue Bold, which Apple devices
// have; elsewhere Arimo, its free near-twin, stands in (see font-magazine).
const arimo = Arimo({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-arimo",
});

type Params = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = DICTIONARIES[lang];
  // The page's address, like the homepage's title.
  const title = `${new URL(PROFILE.site).host}${pageHref(lang, "/styling")}`;
  return {
    title,
    description: t.styling.description,
    alternates: {
      canonical: pageHref(lang, "/styling"),
      languages: {
        en: pageHref("en", "/styling"),
        es: pageHref("es", "/styling"),
        "x-default": pageHref("en", "/styling"),
      },
    },
    // A page's openGraph replaces the layout's whole, so it names the image
    // and the layout's other preview fields again.
    openGraph: {
      title,
      description: t.styling.description,
      type: "website",
      locale: t.ogLocale,
      url: pageHref(lang, "/styling"),
      images: [SHARE_IMAGE.image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: t.styling.description,
      images: [SHARE_IMAGE.image],
    },
  };
}

const anchor = (editorial: Editorial) => editorial.title.toLowerCase();

/**
 * One editorial's photos. On wide screens each row fills the width with its
 * pages at the same height; on phones they flow two pages across, spreads
 * take a full row, and a page left alone does too.
 */
function Photos({ lang, editorial }: { lang: Locale; editorial: Editorial }) {
  const t = DICTIONARIES[lang].styling;
  const all = pagesOf(editorial);
  // Single pages that end up alone on a phone row: the last of an odd run.
  const shots = editorial.rows.flat();
  const alone = new Set<Shot>();
  let run: Shot[] = [];
  for (const shot of [...shots, null]) {
    if (shot?.length === 1) {
      run.push(shot);
      continue;
    }
    if (run.length % 2) alone.add(run[run.length - 1]);
    run = [];
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-col md:gap-2">
      {editorial.rows.map((row, r) => {
        const rowPages = row.reduce((n, shot) => n + shot.length, 0);
        return (
          <div key={r} className="contents md:flex md:gap-2">
            {row.map((shot) => {
              const wide = shot.length > 1 || alone.has(shot);
              return (
                <div
                  key={shot[0]}
                  className={`flex overflow-hidden rounded-[10px] bg-ink/5 ${wide ? "col-span-2" : ""}`}
                  // Width in proportion to its pages, so a row's pages share
                  // one height.
                  style={{ flex: `${shot.length} 1 0%`, aspectRatio: `${3 * shot.length} / 4` }}
                >
                  {shot.map((src) => (
                    <div key={src} className="relative flex-1">
                      <Image
                        src={src}
                        alt={t.photo(editorial.title, all.indexOf(src) + 1, all.length)}
                        fill
                        sizes={`(min-width: 768px) calc((min(100vw, 64rem) - 2rem) / ${rowPages}), ${
                          shot.length === 1 && !wide ? 50 : 100 / shot.length
                        }vw`}
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default async function Styling({ params }: Params) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = DICTIONARIES[lang].styling;

  return (
    <div className={`${arimo.variable} flex min-h-dvh flex-col items-center px-4`}>
      {/* The island stays at the top while the photos scroll under its glass. */}
      <header className="sticky top-3 z-[60] mt-3 h-11 w-[13.5rem] shrink-0 md:h-12 md:w-[17rem] lg:top-5 lg:mt-5">
        <Island page="/styling" />
      </header>

      <main className="w-full max-w-5xl pt-12 pb-16 md:pt-16">
        <p className="font-mono text-[11px] font-light text-muted lg:text-xs">
          {t.kicker}
        </p>
        <h1 className="mt-2 text-[22px] text-fg md:text-[28px]">{t.intro}</h1>

        {/* The magazine's index: each title in its color, linking to its
            photos. */}
        <nav
          aria-label={t.contents}
          className="mt-6 rounded-[20px] bg-black px-[6%] py-[5%] md:rounded-[24px] dark:ring-1 dark:ring-white/[0.06]"
        >
          <ul className="font-magazine text-[clamp(3.25rem,16vw,8.5rem)]">
            {EDITORIALS.map((editorial) => (
              <li key={editorial.title} className="flex items-baseline justify-between gap-4">
                <a
                  href={`#${anchor(editorial)}`}
                  style={{ color: editorial.color }}
                  className="transition-opacity hover:opacity-75"
                >
                  {editorial.title}
                </a>
                <span className="font-mono text-[11px] font-light tracking-normal text-[#999b9e] normal-case lg:text-xs">
                  {t.pages(pagesOf(editorial).length)}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        {EDITORIALS.map((editorial) => (
          <section
            key={editorial.title}
            id={anchor(editorial)}
            aria-labelledby={`${anchor(editorial)}-title`}
            className="mt-16 scroll-mt-20 md:mt-24 lg:scroll-mt-24"
          >
            <h2
              id={`${anchor(editorial)}-title`}
              style={{ color: editorial.color }}
              className="mb-3 font-magazine text-[clamp(2.75rem,11vw,5.5rem)] md:mb-4"
            >
              {editorial.title}
            </h2>
            <Photos lang={lang} editorial={editorial} />
          </section>
        ))}

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
