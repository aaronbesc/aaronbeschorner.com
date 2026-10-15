"use client";

import "react-day-picker/style.css";
import { CalendarDaysIcon } from "@heroicons/react/16/solid";
import { useEffect, useId, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";

// A date field for the tracker (components/Tracker.tsx): the date as text,
// and a calendar that opens below it (above, near the bottom of the
// screen). The calendar is a popover, so it sits in the top layer: it isn't
// clipped by the scrolling table, and a click outside or Escape closes it.
// Its look is in globals.css (.date-picker).
//
// With `months`, a value can also be a whole month ("YYYY-MM"), for dates
// only known roughly, like a start date of "January 2027".

/** "YYYY-MM-DD" or "YYYY-MM" ↔ Date, in local time so no time zone moves the day. */
const parse = (value: string) => {
  const [y, m, d = 1] = value.split("-").map(Number);
  return value ? new Date(y, m - 1, d) : undefined;
};
const format = (date: Date, month = false) =>
  [date.getFullYear(), date.getMonth() + 1, ...(month ? [] : [date.getDate()])]
    .map((n) => String(n).padStart(2, "0"))
    .join("-");

const isMonth = (value: string) => value.length === 7;

const label = (date: Date, month: boolean) => {
  // The year only when it isn't this one (always, for a month).
  const thisYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: month ? undefined : "numeric",
    year: thisYear && !month ? undefined : "numeric",
  });
};

/** How a stored date reads: "Oct 12", or "Jan 2027" for a whole month. */
export const formatDate = (value: string) => {
  const date = parse(value);
  return date ? label(date, isMonth(value)) : "";
};

const HEIGHT = 380; // roughly the open calendar, to decide above or below
const footerButton =
  "rounded-full px-3 py-1 text-[13px] transition-colors hover:bg-pill";

export default function DateField({
  value,
  onChange,
  ariaLabel,
  months = false,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  /** Offer "Whole month" as well as single days. */
  months?: boolean;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const date = parse(value);
  const monthOnly = isMonth(value);
  // The month on screen, which "Whole month" picks.
  const [shown, setShown] = useState<Date>(new Date());

  function show() {
    const rect = button.current!.getBoundingClientRect();
    const below = rect.bottom + 6 + HEIGHT < window.innerHeight;
    setPosition({
      top: below ? rect.bottom + 6 : Math.max(8, rect.top - 6 - HEIGHT),
      left: Math.min(rect.left, window.innerWidth - 300),
    });
    setShown(date ?? new Date());
    popover.current!.showPopover();
  }

  const close = () => popover.current?.hidePopover();

  // It stays where it opened, so close it rather than let it drift when
  // the page or the table scrolls.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function pick(date: Date | undefined, month = false) {
    onChange(date ? format(date, month) : "");
    close();
    button.current?.focus();
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={`${ariaLabel}: ${date ? label(date, monthOnly) : "not set"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? close() : show())}
        // Looks like the tracker's other form fields (components/Tracker.tsx).
        className={`flex w-full items-center gap-2 rounded-lg bg-canvas px-2.5 py-1.5 text-left text-[13px] ring-ink/15 transition-shadow hover:ring-1 ${
          open ? "ring-1" : ""
        }`}
      >
        <CalendarDaysIcon className="size-3.5 shrink-0 text-muted" aria-hidden />
        <span className={`truncate ${date ? "" : "text-muted/60"}`}>
          {date ? label(date, monthOnly) : "set date"}
        </span>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={ariaLabel}
        onToggle={(e) => setOpen(e.newState === "open")}
        style={position}
        className="date-picker fixed inset-auto m-0 rounded-2xl border-0 bg-surface p-3 text-ink shadow-[0_16px_40px_-12px_rgb(0_0_0/0.25)] ring-1 ring-ink/[0.06]"
      >
        {open && (
          <>
            <DayPicker
              mode="single"
              required
              // A whole month has no one day to mark.
              selected={monthOnly ? undefined : date}
              month={shown}
              onMonthChange={setShown}
              onSelect={(day) => pick(day)}
              weekStartsOn={1}
              showOutsideDays
              animate
              autoFocus
            />
            <div className="mt-2 flex justify-between gap-1 border-t border-pill pt-2">
              <button type="button" onClick={() => pick(new Date())} className={footerButton}>
                Today
              </button>
              {months && (
                <button
                  type="button"
                  aria-pressed={monthOnly && date?.getTime() === shown.getTime()}
                  onClick={() => pick(shown, true)}
                  className={`${footerButton} ${monthOnly ? "bg-pill" : ""}`}
                >
                  All of {shown.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </button>
              )}
              <button
                type="button"
                onClick={() => pick(undefined)}
                className={`${footerButton} text-muted hover:text-ink`}
              >
                Clear
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
