import "../globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Cascadia_Code, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { LocaleProvider } from "@/components/Locale";
import { DICTIONARIES, HOME, LOCALES, hasLocale } from "@/lib/i18n";
import { PROFILE } from "@/lib/profile";
import { THEME_SCRIPT } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
});

const cascadia = Cascadia_Code({
  subsets: ["latin"],
  weight: ["300"],
  variable: "--font-cascadia",
});

type Params = { params: Promise<{ lang: string }> };

// One prerendered site per language; any other first segment is a 404.
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));
export const dynamicParams = false;

// The share image itself comes from app/opengraph-image.tsx. Its URL and
// the language alternates are resolved against the production domain.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = DICTIONARIES[lang];
  return {
    metadataBase: new URL(PROFILE.site),
    title: PROFILE.name,
    description: t.description,
    alternates: {
      canonical: HOME[lang],
      languages: { en: HOME.en, es: HOME.es, "x-default": HOME.en },
    },
    openGraph: {
      title: PROFILE.name,
      description: t.description,
      siteName: PROFILE.name,
      type: "website",
      locale: t.ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== lang).map(
        (l) => DICTIONARIES[l].ogLocale,
      ),
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({
  params,
  children,
}: Params & { children: ReactNode }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    // suppressHydrationWarning: THEME_SCRIPT sets data-theme before React loads.
    <html
      lang={lang}
      className={`${inter.variable} ${cascadia.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-canvas font-sans leading-[normal] text-ink antialiased">
        <LocaleProvider lang={lang}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
