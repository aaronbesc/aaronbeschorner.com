import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Cascadia_Code, Inter } from "next/font/google";

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
  title: "Aaron Beschorner",
  description:
    "Data Engineer at Intempo. B.S. in Computer Science from the University of Florida. Based in Madrid, Spain.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cascadia.variable}`}>
      <body className="bg-canvas font-sans leading-[normal] text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
