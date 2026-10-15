"use client";

import {
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
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
import DateField, { formatDate } from "@/components/DateField";
import Pipeline from "@/components/Pipeline";
import {
  MAX_LENGTH,
  PRESET_STATUSES,
  SOURCES,
  WORKPLACES,
  type Application,
  type Field,
  type StatusChange,
} from "@/lib/applications";
import { pillClass } from "@/lib/status";

// The job application tracker (app/admin/applications).
//
// Each application is a row to scan: two lines of text per column, and no
// form controls except the status pill, which changes often enough to
// edit in place. Clicking a row opens its details, where every field is
// edited. Edits save when a field loses focus; the list updates right away
// and rolls back if the save fails.
//
// On wide screens the rows are a table that always fits the page: column
// widths are shares of the room there is, and dragging the edge between
// two headers moves width from one column to its neighbor, like a
// spreadsheet (double-click an edge to reset them all). Any column sorts
// from its header. Narrower than that, each application is a card.

const COLUMNS: { key: Field; label: string; width: number }[] = [
  { key: "company", label: "Company", width: 250 },
  { key: "status", label: "Status", width: 160 },
  { key: "workplace", label: "Workplace", width: 150 },
  { key: "salary", label: "Salary", width: 110 },
  { key: "appliedOn", label: "Applied", width: 100 },
  { key: "nextStepOn", label: "Next step", width: 220 },
];

/** Each column's share of the table, in pixels at the default size. */
type Widths = Record<string, number>;
const DEFAULT_WIDTHS: Widths = Object.fromEntries(COLUMNS.map((c) => [c.key, c.width]));
const MIN_WIDTH = 72; // in real pixels, whatever the table's size
const TOGGLE_WIDTH = 44; // the column with each row's open button
// Remembered in this browser. The name changes with the set of columns,
// so widths saved for an older set don't carry over.
const WIDTHS_KEY = "tracker-widths-2";

/** Each field's name in messages. */
const LABELS: Record<Field, string> = {
  company: "company",
  title: "title",
  referral: "referral",
  status: "status",
  workplace: "workplace",
  salary: "salary",
  email: "email",
  appliedOn: "applied date",
  link: "link",
  notes: "notes",
  startDate: "start date",
  location: "location",
  nextStep: "next step",
  nextStepOn: "next step date",
  source: "source",
  contact: "contact",
};

type Sort = { key: Field; desc: boolean };

/**
 * Applied starts newest first, Referral yes first and Salary highest first;
 * everything else ascending, so text goes A to Z and dates soonest first.
 * (Salaries are digits, so the numeric compare below orders them.)
 */
const startsDescending = (key: Field) =>
  key === "appliedOn" || key === "referral" || key === "salary";

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

/** Whether a click landed on a control, which shouldn't also open the row. */
const onControl = (target: EventTarget) =>
  target instanceof Element && target.closest("button, a, input, select, textarea, label") !== null;

/** Digits as euros with thousands commas: "55000" reads €55,000. */
const euros = (digits: string) => (digits ? `€${Number(digits).toLocaleString("en-US")}` : "");

const CUSTOM = "__custom__";
const SOURCE_LIST = "tracker-sources";

// Form fields in the details: a soft well on the card, outlined on hover
// and focus.
const input =
  "w-full min-w-0 rounded-lg bg-canvas px-2.5 py-1.5 text-[13px] outline-none ring-ink/15 transition-shadow placeholder:text-muted/70 hover:ring-1 focus:ring-1";
const pillButton =
  "rounded-full px-3 py-1.5 text-[13px] transition-colors hover:bg-pill";
const field =
  "rounded-full bg-surface px-4 py-2 text-[14px] outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/20";
// The homepage's card: a white surface lifted by a soft shadow, and a
// hairline ring in dark mode instead.
const card =
  "rounded-2xl bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.05),0_10px_28px_-16px_rgb(0_0_0/0.25)] dark:ring-1 dark:ring-white/[0.06]";

const applications = (n: number) => (n === 1 ? "1 application" : `${n} applications`);

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
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const table = useRef<HTMLTableElement>(null);
  const drag = useRef<{ widths: Widths; scale: number } | null>(null);

  // Saved widths load after the first render, so it matches the server's.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WIDTHS_KEY) ?? "{}");
      const valid: Widths = Object.fromEntries(
        Object.entries(saved).filter(
          (entry): entry is [string, number] =>
            entry[0] in DEFAULT_WIDTHS && typeof entry[1] === "number" && entry[1] > 0,
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
    const sum = COLUMNS.reduce((s, c) => s + widths[c.key], TOGGLE_WIDTH);
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

  const toggle = (id: number) =>
    setOpen((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });

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
            [
              app.company,
              app.title,
              app.location,
              app.nextStep,
              app.contact,
              app.source,
              app.email,
              app.notes,
            ].some((text) => text.toLowerCase().includes(q))),
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
      setError(`Couldn't save ${before.company}'s ${LABELS[field]}. Check the value and try again.`);
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
      // Opened, ready for the rest of its details.
      setOpen((ids) => new Set(ids).add(app.id));
      setError(null);
      form.reset();
      form.querySelector("input")?.focus();
    } catch {
      setError("Couldn't add that application.");
    }
  }

  const toggleSort = (key: Field) =>
    setSort((s) => ({ key, desc: s.key === key ? !s.desc : startsDescending(key) }));

  const sum = COLUMNS.reduce((s, c) => s + widths[c.key], TOGGLE_WIDTH);
  const share = (width: number) => `${(width / sum) * 100}%`;

  const rowProps = (app: Application) => ({
    app,
    statuses,
    save: (field: Field, value: string | boolean) => save(app.id, field, value),
    remove: () => remove(app),
    open: open.has(app.id),
    onToggle: () => toggle(app.id),
  });

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-medium">Applications</h1>
          <p className="mt-1 font-mono text-[13px] font-light text-muted">
            {applications(apps.length)}, {apps.filter((a) => a.referral).length} with a referral
          </p>
        </div>
        <div className="-mr-3 flex gap-1">
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

      <Pipeline apps={apps} history={history} className={`mt-6 ${card}`} />

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-1.5">
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
            >
              {status}
            </Chip>
          ))}
      </nav>

      <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
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
            className="rounded-full bg-ink px-5 py-2 text-[14px] font-medium text-canvas transition-opacity hover:opacity-80"
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
            className={`${field} min-w-0 flex-1 lg:w-60 lg:flex-none`}
          />
          {/* The cards have no headers to sort from. */}
          <SortMenu sort={sort} onChange={setSort} />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[13px] text-gator-orange">
          {error}
        </p>
      )}

      {/* Suggestions for every Source field. */}
      <datalist id={SOURCE_LIST}>
        {SOURCES.map((source) => (
          <option key={source} value={source} />
        ))}
      </datalist>

      {/* Wide screens: the table. */}
      <div className={`mt-5 hidden lg:block ${card}`}>
        <table ref={table} className="w-full table-fixed border-collapse text-left">
          <colgroup>
            {COLUMNS.map(({ key }) => (
              <col key={key} style={{ width: share(widths[key]) }} />
            ))}
            <col style={{ width: share(TOGGLE_WIDTH) }} />
          </colgroup>
          <thead>
            <tr className="border-b border-pill text-[12px] text-muted">
              {COLUMNS.map(({ key, label }, i) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : undefined}
                  className="relative p-0 font-normal"
                >
                  <SortButton
                    label={label}
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
                <span className="sr-only">Details</span>
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
      <div className="mt-5 lg:hidden">
        {shown.length ? (
          <ul className="grid items-start gap-3 md:grid-cols-2">
            {shown.map((app) => (
              <Card key={app.id} {...rowProps(app)} />
            ))}
          </ul>
        ) : (
          <div className={card}>
            <Empty any={apps.length > 0} />
          </div>
        )}
      </div>
    </main>
  );
}

function Empty({ any }: { any: boolean }) {
  return (
    <p className="px-4 py-10 text-center font-mono text-[13px] font-light text-muted">
      {any ? "no applications match" : "no applications yet. add one above."}
    </p>
  );
}

/** A column header: the label, and on its right which way the column sorts. */
function SortButton({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: "asc" | "desc" | null;
  onClick: () => void;
}) {
  const Icon =
    direction === "asc" ? ChevronUpIcon : direction === "desc" ? ChevronDownIcon : ChevronUpDownIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center justify-between gap-1 px-3 py-2.5 transition-colors hover:text-ink ${
        direction ? "text-ink" : ""
      }`}
    >
      <span className="truncate">{label}</span>
      <Icon
        aria-hidden
        className={`size-3.5 shrink-0 transition-opacity ${
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
    <div className="flex shrink-0 items-center rounded-full bg-surface lg:hidden">
      <select
        value={sort.key}
        aria-label="Sort by"
        onChange={(e) => {
          const key = e.target.value as Field;
          onChange({ key, desc: startsDescending(key) });
        }}
        className="cursor-pointer appearance-none bg-transparent py-2 pr-1 pl-4 text-[14px] outline-none"
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
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-baseline gap-1.5 rounded-full px-3 py-1 text-[13px] transition-colors ${
        active ? "bg-ink text-canvas" : "bg-surface hover:bg-pill"
      }`}
    >
      {children}
      <span className={`font-mono text-[11px] font-light ${active ? "opacity-60" : "text-muted"}`}>
        {count}
      </span>
    </button>
  );
}

type RowProps = {
  app: Application;
  statuses: string[];
  save: (field: Field, value: string | boolean) => void;
  remove: () => void;
  open: boolean;
  onToggle: () => void;
};

/** Company, with a tag when it came through a referral, and the title under it. */
function Who({ app }: { app: Application }) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium" title={app.company}>
          {app.company}
        </span>
        {app.referral && (
          <span className="shrink-0 rounded-full bg-pill px-1.5 text-[11px] leading-[18px] text-muted-strong">
            Referral
          </span>
        )}
      </div>
      <p className="truncate text-[12px] text-muted" title={app.title}>
        {app.title}
      </p>
    </div>
  );
}

/** A value with a quieter one under it; either can be missing. */
function Pair({ top, bottom }: { top: string; bottom: string }) {
  const [first, second] = top ? [top, bottom] : [bottom, ""];
  return (
    <div className="min-w-0">
      <p className="truncate" title={first || undefined}>
        {first}
      </p>
      {second && (
        <p className="truncate text-[12px] text-muted" title={second}>
          {second}
        </p>
      )}
    </div>
  );
}

/** The button that opens and closes an application's details. */
function Toggle({ app, open, onToggle, controls }: Pick<RowProps, "app" | "open" | "onToggle"> & { controls: string }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`Details, ${app.company}`}
      onClick={onToggle}
      className="rounded-md p-1 text-muted transition-colors hover:bg-pill hover:text-ink"
    >
      <ChevronDownIcon
        aria-hidden
        className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function Row({ app, statuses, save, remove, open, onToggle }: RowProps) {
  const id = `row-details-${app.id}`;
  const cell = "px-3 py-2.5";
  return (
    <>
      <tr
        onClick={(e) => !onControl(e.target) && onToggle()}
        className="cursor-pointer border-t border-pill text-[13px] transition-colors first:border-t-0 hover:bg-canvas/60"
      >
        <td className={cell}>
          <Who app={app} />
        </td>
        <td className={cell}>
          <Status app={app} statuses={statuses} save={(v) => save("status", v)} />
        </td>
        <td className={cell}>
          <Pair top={app.workplace} bottom={app.location} />
        </td>
        <td className={`${cell} tabular-nums`}>{euros(app.salary)}</td>
        <td className={`${cell} tabular-nums`}>{formatDate(app.appliedOn)}</td>
        <td className={cell}>
          <Pair top={app.nextStep} bottom={formatDate(app.nextStepOn)} />
        </td>
        <td className="px-2 py-2.5 text-right">
          <Toggle app={app} open={open} onToggle={onToggle} controls={id} />
        </td>
      </tr>
      {open && (
        <tr id={id}>
          <td colSpan={COLUMNS.length + 1} className="px-3 pt-1 pb-4">
            <Details app={app} save={save} remove={remove} />
          </td>
        </tr>
      )}
    </>
  );
}

/** The same summary as a row, as a card for narrow screens. */
function Card({ app, statuses, save, remove, open, onToggle }: RowProps) {
  const id = `card-details-${app.id}`;
  const where = [app.workplace, app.location].filter(Boolean).join(" in ");
  const meta = [where, euros(app.salary), app.appliedOn && `applied ${formatDate(app.appliedOn)}`]
    .filter(Boolean)
    .join(", ");
  const next = [app.nextStep, formatDate(app.nextStepOn)].filter(Boolean).join(", ");
  return (
    <li className={`min-w-0 text-[13px] ${card}`}>
      <div onClick={(e) => !onControl(e.target) && onToggle()} className="cursor-pointer p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Who app={app} />
          </div>
          <Status app={app} statuses={statuses} save={(v) => save("status", v)} />
          <Toggle app={app} open={open} onToggle={onToggle} controls={id} />
        </div>
        {meta && <p className="mt-1.5 text-[12px] text-muted">{meta}</p>}
        {next && <p className="mt-0.5 text-[12px]">Next: {next}</p>}
      </div>
      {open && (
        <div id={id} className="border-t border-pill p-3">
          <Details app={app} save={save} remove={remove} />
        </div>
      )}
    </li>
  );
}

/** A field in the details, with its name above it. */
function Labeled({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="mb-1 text-[11px] text-muted-strong">{label}</p>
      {children}
    </div>
  );
}

/** Everything about an application, each field edited in place. */
function Details({ app, save, remove }: Pick<RowProps, "app" | "save" | "remove">) {
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
      <Labeled label="Company">
        <Text app={app} field="company" label="Company" save={save} />
      </Labeled>
      <Labeled label="Title">
        <Text app={app} field="title" label="Title" save={save} />
      </Labeled>
      <Labeled label="Workplace">
        <Workplace app={app} save={save} />
      </Labeled>
      <Labeled label="Location">
        <Text app={app} field="location" label="Location" placeholder="Madrid" save={save} />
      </Labeled>

      <Labeled label="Salary">
        <Salary app={app} save={save} />
      </Labeled>
      <Labeled label="Applied">
        <DateField
          value={app.appliedOn}
          onChange={(v) => save("appliedOn", v)}
          ariaLabel={`Date applied, ${app.company}`}
        />
      </Labeled>
      <Labeled label="Start date">
        <DateField
          months
          value={app.startDate}
          onChange={(v) => save("startDate", v)}
          ariaLabel={`Start date, ${app.company}`}
        />
      </Labeled>
      <Labeled label="Source">
        <Text
          app={app}
          field="source"
          label="Source"
          placeholder="LinkedIn"
          list={SOURCE_LIST}
          save={save}
        />
      </Labeled>

      <Labeled label="Next step" className="sm:col-span-2">
        <Text
          app={app}
          field="nextStep"
          label="Next step"
          placeholder="Technical interview"
          save={save}
        />
      </Labeled>
      <Labeled label="Next step date">
        <DateField
          value={app.nextStepOn}
          onChange={(v) => save("nextStepOn", v)}
          ariaLabel={`Next step date, ${app.company}`}
        />
      </Labeled>
      <Labeled label="Referral">
        <label className="flex h-[30px] cursor-pointer items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={app.referral}
            onChange={(e) => save("referral", e.target.checked)}
            className="size-4 cursor-pointer accent-ink"
          />
          Came through a referral
        </label>
      </Labeled>

      <Labeled label="Contact" className="sm:col-span-2">
        <Text app={app} field="contact" label="Contact" placeholder="Name, email" save={save} />
      </Labeled>
      <Labeled label="Email used">
        <Text app={app} field="email" label="Email used" type="email" save={save} />
      </Labeled>
      <Labeled label="Posting">
        <LinkField app={app} save={save} />
      </Labeled>

      <Labeled label="Notes" className="sm:col-span-2 xl:col-span-4">
        <Notes app={app} save={save} />
      </Labeled>

      <div className="flex justify-end sm:col-span-2 xl:col-span-4">
        <button
          type="button"
          onClick={remove}
          className="-mr-2 rounded-full px-3 py-1 text-[12px] text-muted transition-colors hover:bg-pill hover:text-ink"
        >
          Delete application
        </button>
      </div>
    </div>
  );
}

/** A one-line text field. */
function Text({
  app,
  field,
  label,
  type = "text",
  placeholder,
  list,
  save,
}: {
  app: Application;
  field: Field;
  label: string;
  type?: string;
  placeholder?: string;
  list?: string;
  save: RowProps["save"];
}) {
  const value = app[field] as string;
  return (
    <input
      // Remounts after a save is rolled back, so the field shows the old value.
      key={value}
      type={type}
      list={list}
      defaultValue={value}
      maxLength={MAX_LENGTH[field]}
      placeholder={placeholder}
      aria-label={`${label}, ${app.company}`}
      onBlur={(e) => save(field, e.target.value.trim())}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={input}
    />
  );
}

/** The posting's link, with a button to open it. */
function LinkField({ app, save }: Pick<RowProps, "app" | "save">) {
  return (
    <div className="flex min-w-0 items-center gap-1">
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
      rows={3}
      maxLength={MAX_LENGTH.notes}
      aria-label={`Notes, ${app.company}`}
      onInput={(e) => fit(e.currentTarget)}
      onBlur={(e) => save("notes", e.target.value)}
      className={`${input} block min-h-[4.5rem] field-sizing-content resize-none overflow-hidden whitespace-pre-wrap`}
    />
  );
}

/** Remote, Hybrid or In-person. */
function Workplace({ app, save }: Pick<RowProps, "app" | "save">) {
  return (
    <div className="relative">
      <select
        value={app.workplace}
        aria-label={`Workplace, ${app.company}`}
        onChange={(e) => save("workplace", e.target.value)}
        className={`${input} cursor-pointer appearance-none pr-7 ${app.workplace ? "" : "text-muted/70"}`}
      >
        <option value="" className="bg-surface text-muted">
          Not set
        </option>
        {WORKPLACES.map((place) => (
          <option key={place} className="bg-surface text-ink">
            {place}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

/**
 * Yearly salary. It's formatted as it's typed, keeping the cursor after
 * the same digit it was after, and saved as plain digits.
 */
function Salary({ app, save }: Pick<RowProps, "app" | "save">) {
  return (
    <input
      key={app.salary}
      inputMode="numeric"
      defaultValue={euros(app.salary)}
      placeholder="€"
      aria-label={`Salary, ${app.company}`}
      onInput={(e) => {
        const el = e.currentTarget;
        const caret = el.selectionStart ?? el.value.length;
        const before = el.value.slice(0, caret).replace(/\D/g, "").length;
        const digits = el.value.replace(/\D/g, "").slice(0, 9);
        el.value = euros(digits);
        let at = el.value ? 1 : 0; // just after the € sign
        for (let seen = 0; at < el.value.length && seen < before; at++) {
          if (/\d/.test(el.value[at])) seen++;
        }
        el.setSelectionRange(at, at);
      }}
      onBlur={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        save("salary", digits && String(Number(digits)));
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`${input} tabular-nums`}
    />
  );
}

/**
 * The status as a colored pill, sized to its text, that opens a menu of
 * known statuses; "Custom…" switches it to a text field.
 */
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
        className="w-32 rounded-full bg-pill px-2.5 py-0.5 text-[12px] outline-none"
      />
    );
  }

  return (
    <select
      value={app.status}
      title={app.status}
      aria-label={`Status, ${app.company}`}
      onChange={(e) => (e.target.value === CUSTOM ? setCustom(true) : save(e.target.value))}
      className={`max-w-full cursor-pointer appearance-none truncate rounded-full px-2.5 py-0.5 text-[12px] font-medium outline-none field-sizing-content transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-current dark:hover:brightness-125 ${pillClass(app.status)}`}
    >
      {statuses.map((status) => (
        <option key={status} className="bg-surface font-normal text-ink">
          {status}
        </option>
      ))}
      <option value={CUSTOM} className="bg-surface font-normal text-ink">
        Custom…
      </option>
    </select>
  );
}
