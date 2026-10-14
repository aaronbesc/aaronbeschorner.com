import "../globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Cascadia_Code, Inter } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";

// Root layout for the private pages. They sit outside the [lang] site:
// English only, not in the menu, and kept out of search engines (the
// X-Robots-Tag header in next.config.ts says the same to crawlers).

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

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: THEME_SCRIPT sets data-theme before React loads.
    <html
      lang="en"
      className={`${inter.variable} ${cascadia.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-canvas font-sans leading-[normal] text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
