"use client";

import {
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from "@heroicons/react/16/solid";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  addApplication,
  editApplication,
  logOut,
  removeApplication,
} from "@/app/admin/applications/actions";
import DateField from "@/components/DateField";
import Pipeline from "@/components/Pipeline";
import {
  MAX_LENGTH,
  PRESET_STATUSES,
  type Application,
  type Field,
  type StatusChange,
} from "@/lib/applications";
import { pillClass, statusColor } from "@/lib/status";

// The job application tracker (app/admin/applications). Every cell edits
// in place and saves when it loses focus; the list updates right away and
// rolls back if the save fails.
//
// On wide screens it's a table that always fits the page: column widths are
// shares of the room there is, and dragging the edge between two headers
// moves width from one column to its neighbor, like a spreadsheet
// (double-click an edge to reset them all). Any column sorts from its
// header. Narrower than that, each application becomes a card.

const COLUMNS: { key: Field; label: string; width: number; center?: boolean }[] = [
  { key: "company", label: "Company", width: 150 },
  { key: "title", label: "Title", width: 185 },
  { key: "referral", label: "Referral", width: 110, center: true },
  { key: "status", label: "Status", width: 175 },
  { key: "email", label: "Email used", width: 180 },
  { key: "appliedOn", label: "Applied", width: 120 },
  { key: "startDate", label: "Start", width: 135 },
  { key: "link", label: "Link", width: 140 },
  { key: "notes", label: "Notes", width: 165 },
];

/** Each column's share of the table, in pixels at the default size. */
type Widths = Record<Field, number>;
const DEFAULT_WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.key, c.width])) as Widths;
const MIN_WIDTH = 64; // in real pixels, whatever the table's size
const ACTIONS_WIDTH = 40; // the delete column
const WIDTHS_KEY = "tracker-widths"; // remembered in this browser

type Sort = { key: Field; desc: boolean };

/**
 * Applied starts newest first and Referral yes first; everything else
 * ascending, so text goes A to Z and start dates soonest first.
 */
const startsDescending = (key: Field) => key === "appliedOn" || key === "referral";

function compare(a: Application, b: Application, { key, desc }: Sort) {
  const x = a[key];
  const y = b[key];
  let order: number;
  if (typeof x === "boolean") {
    order = Number(x) - Number(y as boolean);
  } else {
    // Empty cells go last whichever way the column is sorted.
    if (!x !== !y) return x ? -1 : 1;
    order = x.localeCompare(y as string, undefined, { sensitivity: "base", numeric: true });
  }
  return (desc ? -order : order) || b.id - a.id;
}

const CUSTOM = "__custom__";

const cellInput =
  "w-full min-w-0 truncate rounded-md bg-transparent px-2 py-1.5 outline-none transition-colors hover:bg-pill focus:bg-pill";
const pillButton =
  "rounded-full px-3.5 py-1.5 text-[14px] transition-colors hover:bg-pill";
const field =
  "rounded-full bg-surface px-4 py-2 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/20";

export default function Tracker({
  initial,
  initialHistory,
}: {
  initial: Application[];
  initialHistory: StatusChange[];
}) {
  const [apps, setApps] = useState(initial);
  const [history, setHistory] = useState(initialHistory);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "appliedOn", desc: true });
  const [widths, setWidths] = useState(DEFAULT_WIDTHS);
  const [error, setError] = useState<string | null>(null);
  const table = useRef<HTMLTableElement>(null);
  const drag = useRef<{ widths: Widths; scale: number } | null>(null);

  // Saved widths load after the first render, so it matches the server's.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WIDTHS_KEY) ?? "{}");
      const valid = Object.fromEntries(
        Object.entries(saved).filter(
          ([key, width]) => key in DEFAULT_WIDTHS && typeof width === "number" && width > 0,
        ),
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage
      setWidths((w) => ({ ...w, ...valid }));
    } catch {
      // Storage can be blocked; the default widths stay.
    }
  }, []);

  function storeWidths(next: Widths) {
    try {
      localStorage.setItem(WIDTHS_KEY, JSON.stringify(next));
    } catch {
      // Then the widths last until reload.
    }
  }

  // Resizing. Widths are shares, so a drag of some pixels is converted to
  // share units for the table's current size, taken from one column and
  // given to the next: the table's total never changes.
  function startResize() {
    const sum = COLUMNS.reduce((s, c) => s + widths[c.key], ACTIONS_WIDTH);
    const px = table.current?.getBoundingClientRect().width ?? sum;
    drag.current = { widths, scale: sum / px };
  }

  function moveResize(index: number, dx: number) {
    const start = drag.current;
    if (!start) return;
    const a = COLUMNS[index].key;
    const b = COLUMNS[index + 1].key;
    const min = MIN_WIDTH * start.scale;
    const d = Math.min(
      Math.max(dx * start.scale, min - start.widths[a]),
      start.widths[b] - min,
    );
    setWidths({ ...start.widths, [a]: start.widths[a] + d, [b]: start.widths[b] - d });
  }

  function endResize() {
    drag.current = null;
    setWidths((w) => {
      storeWidths(w);
      return w;
    });
  }

  function resetWidths() {
    setWidths(DEFAULT_WIDTHS);
    storeWidths(DEFAULT_WIDTHS);
  }

  // Presets first, then custom statuses in the order they first appear.
  const statuses = useMemo(() => {
    const all = [...PRESET_STATUSES];
    for (const app of apps) if (!all.includes(app.status)) all.push(app.status);
    return all;
  }, [apps]);

  const counts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of apps) counts.set(app.status, (counts.get(app.status) ?? 0) + 1);
    return counts;
  }, [apps]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps
      .filter(
        (app) =>
          (!filter || app.status === filter) &&
          (!q ||
            [app.company, app.title, app.email, app.notes].some((text) =>
              text.toLowerCase().includes(q),
            )),
      )
      .sort((a, b) => compare(a, b, sort));
  }, [apps, filter, query, sort]);

  async function save(id: number, field: Field, value: string | boolean) {
    const before = apps.find((app) => app.id === id);
    if (!before || before[field] === value) return;
    setApps((list) => list.map((app) => (app.id === id ? { ...app, [field]: value } : app)));
    try {
      await editApplication(id, field, value);
      // The server recorded the change too (lib/db.ts).
      if (field === "status") {
        setHistory((h) => [...h, { applicationId: id, status: value as string }]);
      }
      setError(null);
    } catch {
      setApps((list) => list.map((app) => (app.id === id ? before : app)));
      const name = COLUMNS.find((c) => c.key === field)!.label.toLowerCase();
      setError(`Couldn't save ${before.company}'s ${name}. Check the value and try again.`);
    }
  }

  async function remove(app: Application) {
    if (!confirm(`Delete ${app.company}, ${app.title}?`)) return;
    setApps((list) => list.filter((a) => a.id !== app.id));
    try {
      await removeApplication(app.id);
      setHistory((h) => h.filter((c) => c.applicationId !== app.id));
      setError(null);
    } catch {
      setApps((list) => [...list, app]);
      setError(`Couldn't delete ${app.company}.`);
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const app = await addApplication({
        company: data.get("company"),
        title: data.get("title"),
      });
      setApps((list) => [app, ...list]);
      setHistory((h) => [...h, { applicationId: app.id, status: app.status }]);
      setError(null);
      form.reset();
      form.querySelector("input")?.focus();
    } catch {
      setError("Couldn't add that application.");
    }
  }

  const toggleSort = (key: Field) =>
    setSort((s) => ({ key, desc: s.key === key ? !s.desc : startsDescending(key) }));

  const sum = COLUMNS.reduce((s, c) => s + widths[c.key], ACTIONS_WIDTH);
  const share = (width: number) => `${(width / sum) * 100}%`;

  const rowProps = (app: Application) => ({
    app,
    statuses,
    save: (field: Field, value: string | boolean) => save(app.id, field, value),
    remove: () => remove(app),
  });

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-medium">Applications</h1>
          <p className="mt-1 font-mono text-[14px] font-light text-muted">
            {apps.length} total · {apps.filter((a) => a.referral).length} with a referral
          </p>
        </div>
        <div className="flex gap-1">
          <a href="/admin/applications/export" download className={pillButton}>
            Export CSV
          </a>
          <form action={logOut}>
            <button type="submit" className={`${pillButton} text-muted hover:text-ink`}>
              Sign out
            </button>
          </form>
        </div>
      </header>

      <Pipeline apps={apps} history={history} />

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        <Chip active={!filter} onClick={() => setFilter(null)} count={apps.length}>
          All
        </Chip>
        {statuses
          .filter((status) => counts.has(status))
          .map((status) => (
            <Chip
              key={status}
              active={filter === status}
              onClick={() => setFilter(filter === status ? null : status)}
              count={counts.get(status)!}
              dot={statusColor(status)}
            >
              {status}
            </Chip>
          ))}
      </nav>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="company"
            required
            maxLength={MAX_LENGTH.company}
            placeholder="Company"
            aria-label="Company"
            className={`${field} min-w-0 sm:flex-1`}
          />
          <input
            name="title"
            required
            maxLength={MAX_LENGTH.title}
            placeholder="Title"
            aria-label="Title"
            className={`${field} min-w-0 sm:flex-1`}
          />
          <button
            type="submit"
            className="rounded-full bg-ink px-5 py-2 text-[15px] font-medium text-canvas transition-opacity hover:opacity-80"
          >
            Add
          </button>
        </form>
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search applications"
            className={`${field} min-w-0 flex-1 lg:w-64 lg:flex-none`}
          />
          {/* The cards have no headers to sort from. */}
          <SortMenu sort={sort} onChange={setSort} />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[14px] text-gator-orange">
          {error}
        </p>
      )}

      {/* Wide screens: the table. */}
      <div className="mt-6 hidden rounded-2xl bg-surface xl:block">
        <table ref={table} className="w-full table-fixed border-collapse text-left text-[14px]">
          <colgroup>
            {COLUMNS.map(({ key }) => (
              <col key={key} style={{ width: share(widths[key]) }} />
            ))}
            <col style={{ width: share(ACTIONS_WIDTH) }} />
          </colgroup>
          <thead>
            <tr className="border-b border-pill text-[13px] text-muted">
              {COLUMNS.map(({ key, label, center }, i) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : undefined}
                  className="relative p-0 font-normal"
                >
                  <SortButton
                    label={label}
                    center={center}
                    direction={sort.key === key ? (sort.desc ? "desc" : "asc") : null}
                    onClick={() => toggleSort(key)}
                  />
                  {/* The last column's edge is the table's, which stays put. */}
                  {i < COLUMNS.length - 1 && (
                    <Resizer
                      label={label}
                      onStart={startResize}
                      onMove={(dx) => moveResize(i, dx)}
                      onEnd={endResize}
                      onReset={resetWidths}
                    />
                  )}
                </th>
              ))}
              <th scope="col">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((app) => (
              <Row key={app.id} {...rowProps(app)} />
            ))}
          </tbody>
        </table>
        {!shown.length && <Empty any={apps.length > 0} />}
      </div>

      {/* Narrower: a card per application, two across on tablets. */}
      <div className="mt-6 xl:hidden">
        {shown.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((app) => (
              <Card key={app.id} {...rowProps(app)} />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl bg-surface">
            <Empty any={apps.length > 0} />
          </div>
        )}
      </div>
    </main>
  );
}

function Empty({ any }: { any: boolean }) {
  return (
    <p className="px-4 py-10 text-center font-mono text-[14px] font-light text-muted">
      {any ? "no applications match" : "no applications yet. add one above."}
    </p>
  );
}

/** A column header: the label, and on its right which way the column sorts. */
function SortButton({
  label,
  center,
  direction,
  onClick,
}: {
  label: string;
  center?: boolean;
  direction: "asc" | "desc" | null;
  onClick: () => void;
}) {
  const Icon =
    direction === "asc" ? ChevronUpIcon : direction === "desc" ? ChevronDownIcon : ChevronUpDownIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-1 px-3 py-3 transition-colors hover:text-ink ${
        direction ? "text-ink" : ""
      } ${center ? "justify-center" : "justify-between"}`}
    >
      <span className="truncate">{label}</span>
      <Icon
        aria-hidden
        className={`size-4 shrink-0 transition-opacity ${
          direction ? "" : "opacity-40 group-hover:opacity-100"
        }`}
      />
    </button>
  );
}

/** Sorting for the cards: a column, and a button that flips the order. */
function SortMenu({ sort, onChange }: { sort: Sort; onChange: (sort: Sort) => void }) {
  const Icon = sort.desc ? ChevronDownIcon : ChevronUpIcon;
  return (
    <div className="flex shrink-0 items-center rounded-full bg-surface xl:hidden">
      <select
        value={sort.key}
        aria-label="Sort by"
        onChange={(e) => {
          const key = e.target.value as Field;
          onChange({ key, desc: startsDescending(key) });
        }}
        className="cursor-pointer appearance-none bg-transparent py-2 pl-4 pr-1 text-[15px] outline-none"
      >
        {COLUMNS.map(({ key, label }) => (
          <option key={key} value={key} className="bg-surface text-ink">
            {label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange({ ...sort, desc: !sort.desc })}
        aria-label={sort.desc ? "Sorted descending; sort ascending" : "Sorted ascending; sort descending"}
        className="rounded-full p-2 pr-3 text-muted transition-colors hover:text-ink"
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * The draggable edge on a header's right side. Drag to move width between
 * this column and the next, double-click to reset every column; with the
 * keyboard, focus it and use the arrow keys.
 */
function Resizer({
  label,
  onStart,
  onMove,
  onEnd,
  onReset,
}: {
  label: string;
  onStart: () => void;
  onMove: (dx: number) => void;
  onEnd: () => void;
  onReset: () => void;
}) {
  const x = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    x.current = e.clientX;
    onStart();
    setDragging(true);
  }

  function up() {
    if (x.current === null) return;
    x.current = null;
    setDragging(false);
    onEnd();
  }

  function key(e: KeyboardEvent<HTMLDivElement>) {
    const step = (e.shiftKey ? 64 : 16) * (e.key === "ArrowLeft" ? -1 : 1);
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    onStart();
    onMove(step);
    onEnd();
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={(e) => x.current !== null && onMove(e.clientX - x.current)}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={onReset}
      onKeyDown={key}
      className="group absolute inset-y-0 -right-1.5 z-10 flex w-3 cursor-col-resize touch-none justify-center outline-none"
    >
      <span
        className={`my-2 w-0.5 rounded-full transition-colors ${
          dragging ? "bg-ink" : "bg-transparent group-hover:bg-muted group-focus-visible:bg-ink"
        }`}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  count,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  dot?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[14px] transition-colors ${
        active ? "bg-ink text-canvas" : "bg-surface hover:bg-pill"
      }`}
    >
      {dot && <span aria-hidden className="size-2 rounded-full" style={{ background: dot }} />}
      <span>
        {children} <span className={active ? "opacity-60" : "text-muted"}>{count}</span>
      </span>
    </button>
  );
}

type RowProps = {
  app: Application;
  statuses: string[];
  save: (field: Field, value: string | boolean) => void;
  remove: () => void;
};

/** One-line text cell. */
function Text({
  app,
  field,
  label,
  type = "text",
  placeholder,
  save,
  className = "",
}: {
  app: Application;
  field: Field;
  label: string;
  type?: string;
  placeholder?: string;
  save: RowProps["save"];
  className?: string;
}) {
  const value = app[field] as string;
  return (
    <input
      // Remounts after a save is rolled back, so the input shows the old value.
      key={value}
      type={type}
      defaultValue={value}
      // The whole value on hover, for when the column is too narrow.
      title={value || undefined}
      maxLength={MAX_LENGTH[field]}
      placeholder={placeholder}
      aria-label={`${label}, ${app.company}`}
      onBlur={(e) => save(field, e.target.value.trim())}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`${cellInput} placeholder:text-muted/60 ${className}`}
    />
  );
}

/** The posting's link, with a button to open it. */
function LinkField({ app, save }: Pick<RowProps, "app" | "save">) {
  return (
    <div className="flex min-w-0 items-center">
      <Text app={app} field="link" label="Link" type="url" placeholder="https://" save={save} />
      {app.link && (
        <a
          href={app.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${app.company} posting`}
          className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-pill hover:text-ink"
        >
          <ArrowTopRightOnSquareIcon className="size-3.5" aria-hidden />
        </a>
      )}
    </div>
  );
}

/** Notes grow to fit what's written, so they never scroll inside. */
function Notes({ app, save }: Pick<RowProps, "app" | "save">) {
  // field-sizing does it in CSS; where that's missing, size by hand.
  const fit = (el: HTMLTextAreaElement | null) => {
    if (!el || CSS.supports("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  return (
    <textarea
      key={app.notes}
      ref={fit}
      defaultValue={app.notes}
      rows={1}
      maxLength={MAX_LENGTH.notes}
      placeholder="notes"
      aria-label={`Notes, ${app.company}`}
      onInput={(e) => fit(e.currentTarget)}
      onBlur={(e) => save("notes", e.target.value)}
      className={`${cellInput} block field-sizing-content resize-none overflow-hidden whitespace-pre-wrap placeholder:text-muted/60`}
    />
  );
}

/** When the job would start: a day, or just a month when that's all that's known. */
function StartDate({ app, save }: Pick<RowProps, "app" | "save">) {
  return (
    <DateField
      months
      value={app.startDate}
      onChange={(v) => save("startDate", v)}
      ariaLabel={`Start date, ${app.company}`}
    />
  );
}

function Delete({ app, remove }: Pick<RowProps, "app" | "remove">) {
  return (
    <button
      type="button"
      onClick={remove}
      aria-label={`Delete ${app.company}`}
      className="rounded-md p-1.5 text-muted transition-colors hover:bg-pill hover:text-ink"
    >
      <XMarkIcon className="size-4" aria-hidden />
    </button>
  );
}

function Row({ app, statuses, save, remove }: RowProps) {
  return (
    <tr className="border-b border-pill align-top last:border-0">
      <td className="px-1 py-1 font-medium">
        <Text app={app} field="company" label="Company" save={save} />
      </td>
      <td className="px-1 py-1">
        <Text app={app} field="title" label="Title" save={save} />
      </td>
      <td className="px-1 py-1 text-center">
        <Check checked={app.referral} label={`Referral, ${app.company}`} onChange={(v) => save("referral", v)} />
      </td>
      <td className="px-1 py-1">
        <Status app={app} statuses={statuses} save={(v) => save("status", v)} />
      </td>
      <td className="px-1 py-1">
        <Text app={app} field="email" label="Email used" type="email" placeholder="email" save={save} />
      </td>
      <td className="px-1 py-1">
        <DateField
          value={app.appliedOn}
          onChange={(v) => save("appliedOn", v)}
          ariaLabel={`Date applied, ${app.company}`}
        />
      </td>
      <td className="px-1 py-1">
        <StartDate app={app} save={save} />
      </td>
      <td className="px-1 py-1">
        <LinkField app={app} save={save} />
      </td>
      <td className="px-1 py-1">
        <Notes app={app} save={save} />
      </td>
      <td className="px-1 py-1 text-center">
        <Delete app={app} remove={remove} />
      </td>
    </tr>
  );
}

/** The same fields as a row, as a card for narrow screens. */
function Card({ app, statuses, save, remove }: RowProps) {
  const label = "w-20 shrink-0 px-2 text-[13px] text-muted";
  return (
    <li className="min-w-0 rounded-2xl bg-surface p-2 text-[14px]">
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <Text app={app} field="company" label="Company" save={save} className="text-[16px] font-medium" />
          <Text app={app} field="title" label="Title" save={save} className="text-muted" />
        </div>
        <Delete app={app} remove={remove} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-2">
        <Status app={app} statuses={statuses} save={(v) => save("status", v)} />
        <div className="w-36">
          <DateField
            value={app.appliedOn}
            onChange={(v) => save("appliedOn", v)}
            ariaLabel={`Date applied, ${app.company}`}
          />
        </div>
      </div>
      <dl className="mt-2 border-t border-pill pt-2">
        <div className="flex items-center">
          <dt className={label}>Email</dt>
          <dd className="min-w-0 flex-1">
            <Text app={app} field="email" label="Email used" type="email" placeholder="email" save={save} />
          </dd>
        </div>
        <div className="flex items-center">
          <dt className={label}>Start</dt>
          <dd className="min-w-0 flex-1">
            <StartDate app={app} save={save} />
          </dd>
        </div>
        <div className="flex items-center">
          <dt className={label}>Link</dt>
          <dd className="min-w-0 flex-1">
            <LinkField app={app} save={save} />
          </dd>
        </div>
        <div className="flex items-start">
          <dt className={`${label} pt-1.5`}>Notes</dt>
          <dd className="min-w-0 flex-1">
            <Notes app={app} save={save} />
          </dd>
        </div>
      </dl>
      <div className="mt-1 flex gap-5 px-2 pb-1 text-[13px]">
        <label className="flex cursor-pointer items-center gap-2">
          <Check checked={app.referral} label={`Referral, ${app.company}`} onChange={(v) => save("referral", v)} />
          Referral
        </label>
      </div>
    </li>
  );
}

function Check({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      onChange={(e) => onChange(e.target.checked)}
      className="my-2 size-4 cursor-pointer accent-ink"
    />
  );
}

/** A colored pill menu of known statuses; "Custom…" switches to a text field. */
function Status({
  app,
  statuses,
  save,
}: {
  app: Application;
  statuses: string[];
  save: (status: string) => void;
}) {
  const [custom, setCustom] = useState(false);

  if (custom) {
    return (
      <input
        autoFocus
        defaultValue=""
        maxLength={MAX_LENGTH.status}
        placeholder="New status"
        aria-label={`Custom status, ${app.company}`}
        onBlur={(e) => {
          const value = e.target.value.trim();
          if (value) save(value);
          setCustom(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setCustom(false);
        }}
        className={`${cellInput} bg-pill`}
      />
    );
  }

  return (
    <div className="py-1">
      <div
        className={`relative inline-flex max-w-full items-center rounded-full transition-[filter] hover:brightness-95 dark:hover:brightness-125 ${pillClass(app.status)}`}
      >
        <select
          value={app.status}
          title={app.status}
          aria-label={`Status, ${app.company}`}
          onChange={(e) => (e.target.value === CUSTOM ? setCustom(true) : save(e.target.value))}
          className="min-w-0 cursor-pointer appearance-none truncate rounded-full bg-transparent py-1 pl-3 pr-7 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          {statuses.map((status) => (
            <option key={status} className="bg-surface text-ink">
              {status}
            </option>
          ))}
          <option value={CUSTOM} className="bg-surface text-ink">
            Custom…
          </option>
        </select>
        <ChevronDownIcon aria-hidden className="pointer-events-none absolute right-2 size-3.5 opacity-70" />
      </div>
    </div>
  );
}
