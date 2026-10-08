"use client";

import { createContext, use, type ReactNode } from "react";
import { DICTIONARIES, type Locale } from "@/lib/i18n";

// The page's language, for client components; server components get it
// from the [lang] route segment.
const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({
  lang,
  children,
}: {
  lang: Locale;
  children: ReactNode;
}) {
  return <LocaleContext value={lang}>{children}</LocaleContext>;
}

export function useLocale() {
  return use(LocaleContext);
}

/** The interface text in the page's language. */
export function useDictionary() {
  return DICTIONARIES[useLocale()];
}
