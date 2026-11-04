"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { CATEGORIES, topicOf, type Writing } from "@/lib/writings";

// Layout after mattrickard.com/archive (categories beside a dated list),
// restyled like calebwu.ca: softer type, hairline dividers, muted until hover.

/** "all", a category id, or "category/topic". */
type Filter = string;

const matches = (w: Writing, filter: Filter) => {
  if (filter === "all") return true;
  const [category, topic] = filter.split("/");
  return w.category === category && (!topic || w.topic === topic);
};

/** 2026-07-22 → 07-22-26 in English, 22-07-26 in Spanish. */
function shortDate(iso: string, lang: Locale) {
  const [y, m, d] = iso.split("-");
  const yy = y.slice(2);
  return lang === "en" ? `${m}-${d}-${yy}` : `${d}-${m}-${yy}`;
}

export default function WritingList({
  lang,
  writings,
  t,
}: {
  lang: Locale;
  writings: Writing[];
  t: { all: string; filters: string; empty: string };
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const activeCategory = filter === "all" ? null : filter.split("/")[0];
  const shown = writings
    .filter((w) => matches(w, filter))
    .toSorted((a, b) => b.date.localeCompare(a.date));
  const count = (f: Filter) => writings.filter((w) => matches(w, f)).length;

  const option = (f: Filter, label: string, sub = false) => {
    const active = filter === f;
    return (
      <button
        key={f}
        type="button"
        aria-pressed={active}
        onClick={() => setFilter(f)}
        className={`group flex shrink-0 cursor-pointer items-baseline gap-1.5 rounded-full whitespace-nowrap transition-colors max-lg:px-3 max-lg:py-1.5 lg:rounded-none ${
          sub ? "text-[13px] lg:pl-3" : "text-[14px] lg:text-[15px]"
        } ${
          active
            ? "text-ink max-lg:bg-pill lg:font-medium"
            : "text-muted hover:text-ink"
        }`}
      >
        {label}
        <span className="font-mono text-[10px] font-light text-muted lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:group-aria-pressed:opacity-100">
          {count(f)}
        </span>
      </button>
    );
  };

  const subtopics = (categoryId: string) => {
    const category = CATEGORIES.find((c) => c.id === categoryId)!;
    return category.topics.map((topic) =>
      option(`${category.id}/${topic.id}`, topic.label[lang], true),
    );
  };

  return (
    <div className="lg:grid lg:grid-cols-[11rem_1fr] lg:gap-10">
      {/* Phones and tablets: a scrolling row of categories, with the chosen
          category's topics in a second row. Wide screens: a sticky column,
          each category's topics opening under it. */}
      <nav aria-label={t.filters} className="lg:sticky lg:top-28 lg:self-start">
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-2 lg:overflow-visible lg:px-0">
          {option("all", t.all)}
          {CATEGORIES.map((category) => (
            <div key={category.id} className="contents lg:flex lg:flex-col lg:gap-1.5">
              {option(category.id, category.label[lang])}
              {activeCategory === category.id && (
                <div className="hidden lg:flex lg:flex-col lg:gap-1.5">
                  {subtopics(category.id)}
                </div>
              )}
            </div>
          ))}
        </div>
        {activeCategory && (
          <div className="-mx-4 mt-1 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden">
            {subtopics(activeCategory)}
          </div>
        )}
      </nav>

      <ul className="mt-6 lg:mt-0">
        {shown.map((w) => {
          const topic = topicOf(w.category, w.topic);
          return (
            <li
              key={w.slug}
              className="group grid grid-cols-[4.75rem_1fr] items-baseline gap-x-3 border-b border-ink/[0.08] py-4 first:pt-1 sm:grid-cols-[6rem_1fr_auto] sm:gap-x-6 md:py-5"
            >
              <time
                dateTime={w.date}
                className="font-mono text-[11px] font-light text-muted tabular-nums lg:text-xs"
              >
                {shortDate(w.date, lang)}
              </time>
              <span className="text-[16px] text-ink transition-colors group-hover:text-muted md:text-[18px]">
                {w.title}
              </span>
              {topic && (
                <span className="col-start-2 mt-1 font-mono text-[11px] font-light text-muted sm:col-start-3 sm:mt-0 lg:text-xs">
                  {topic.label[lang]}
                </span>
              )}
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="py-4 font-mono text-[11px] font-light text-muted lg:text-xs">
            {t.empty}
          </li>
        )}
      </ul>
    </div>
  );
}
