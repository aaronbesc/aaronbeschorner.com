import "./globals.css";
import type { Metadata } from "next";
import { Cascadia_Code, Inter } from "next/font/google";
import Link from "next/link";
import { HOME } from "@/lib/i18n";
import { THEME_SCRIPT } from "@/lib/theme";

// The 404 for URLs that match no route. It renders outside the [lang]
// layout, so it brings its own fonts and theme, and speaks both languages.

const inter = Inter({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-inter",
});

const cascadia = Cascadia_Code({
  subsets: ["latin"],
  weight: ["300"],
  variable: "--font-cascadia",
});

export const metadata: Metadata = {
  title: "404 · Aaron Beschorner",
};

const link =
  "underline decoration-from-font [text-underline-position:from-font] hover:text-muted";

export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cascadia.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-canvas font-sans leading-[normal] text-ink antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <p className="font-mono text-[15px] font-light text-muted">
            <span className="text-ink">$</span> cd {"<this page>"}
            <br />
            no such file or directory
          </p>
          <p className="mt-6 flex gap-5 text-[20px]">
            <Link href={HOME.en} className={link}>
              Back home
            </Link>
            <Link href={HOME.es} hrefLang="es" lang="es" className={link}>
              Volver al inicio
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
