import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Cascadia_Code, Inter } from "next/font/google";
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

const description =
  "Data Engineer at Intempo. B.S. in Computer Science from the University of Florida. Based in Madrid, Spain.";

// The share image itself comes from app/opengraph-image.tsx. On Vercel,
// Next.js resolves its absolute URL from the production domain.
export const metadata: Metadata = {
  title: "Aaron Beschorner",
  description,
  openGraph: {
    title: "Aaron Beschorner",
    description,
    siteName: "Aaron Beschorner",
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
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
