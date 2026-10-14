"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  addApplication,
  editApplication,
  logOut,
  removeApplication,
} from "@/app/admin/applications/actions";
import {
  MAX_LENGTH,
  PRESET_STATUSES,
  type Application,
  type Field,
} from "@/lib/applications";

// The job application tracker (app/admin/applications). Every cell edits
// in place and saves when it loses focus; the table updates right away and
// rolls back if the save fails.

type SortKey = "company" | "title" | "status" | "appliedOn";

const COLUMNS: { label: string; sort?: SortKey; className?: string }[] = [
  { label: "Company", sort: "company" },
  { label: "Title", sort: "title" },
  { label: "Referral", className: "text-center" },
  { label: "Status", sort: "status" },
  { label: "Email used" },
  { label: "Applied", sort: "appliedOn" },
  { label: "Link" },
  { label: "Notes" },
  { label: "Creds saved", className: "text-center" },
  { label: "" },
];

const CUSTOM = "__custom__";

const cellInput =
  "w-full min-w-0 rounded-md bg-transparent px-2 py-1.5 outline-none transition-colors hover:bg-pill focus:bg-pill";
const pillButton =
  "rounded-full px-3.5 py-1.5 text-[14px] transition-colors hover:bg-pill";

export default function Tracker({ initial }: { initial: Application[] }) {
  const [apps, setApps] = useState(initial);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "appliedOn",
    desc: true,
  });
  const [error, setError] = useState<string | null>(null);

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
    const rows = apps.filter(
      (app) =>
        (!filter || app.status === filter) &&
        (!q ||
          [app.company, app.title, app.email, app.notes].some((text) =>
            text.toLowerCase().includes(q),
          )),
    );
    const { key, desc } = sort;
    return rows.sort((a, b) => {
      // Rows without a date go last either way.
      if (key === "appliedOn" && !a.appliedOn !== !b.appliedOn) return a.appliedOn ? -1 : 1;
      const order = a[key].localeCompare(b[key], undefined, { sensitivity: "base" });
      return (desc ? -order : order) || b.id - a.id;
    });
  }, [apps, filter, query, sort]);

  async function save(id: number, field: Field, value: string | boolean) {
    const before = apps.find((app) => app.id === id);
    if (!before || before[field] === value) return;
    setApps((list) => list.map((app) => (app.id === id ? { ...app, [field]: value } : app)));
    try {
      await editApplication(id, field, value);
      setError(null);
    } catch {
      setApps((list) => list.map((app) => (app.id === id ? before : app)));
      setError(`Couldn't save ${before.company}'s ${field}. Check the value and try again.`);
    }
  }

  async function remove(app: Application) {
    if (!confirm(`Delete ${app.company}, ${app.title}?`)) return;
    setApps((list) => list.filter((a) => a.id !== app.id));
    try {
      await removeApplication(app.id);
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
      setError(null);
      form.reset();
      form.querySelector("input")?.focus();
    } catch {
      setError("Couldn't add that application.");
    }
  }

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, desc: s.key === key ? !s.desc : key === "appliedOn" }));

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-8">
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
            >
              {status}
            </Chip>
          ))}
      </nav>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="company"
            required
            maxLength={MAX_LENGTH.company}
            placeholder="Company"
            aria-label="Company"
            className="rounded-full bg-surface px-4 py-2 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/20"
          />
          <input
            name="title"
            required
            maxLength={MAX_LENGTH.title}
            placeholder="Title"
            aria-label="Title"
            className="rounded-full bg-surface px-4 py-2 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/20"
          />
          <button
            type="submit"
            className="rounded-full bg-ink px-5 py-2 text-[15px] font-medium text-canvas transition-opacity hover:opacity-80"
          >
            Add
          </button>
        </form>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search applications"
          className="rounded-full bg-surface px-4 py-2 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/20 sm:w-64"
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[14px] text-gator-orange">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl bg-surface">
        <table className="w-full min-w-[1100px] border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-pill text-[13px] text-muted">
              {COLUMNS.map(({ label, sort: key, className }) => (
                <th
                  key={label}
                  scope="col"
                  aria-sort={
                    key && sort.key === key ? (sort.desc ? "descending" : "ascending") : undefined
                  }
                  className={`px-3 py-3 font-normal ${className ?? ""}`}
                >
                  {key ? (
                    <button type="button" onClick={() => toggleSort(key)} className="hover:text-ink">
                      {label}
                      {sort.key === key && (sort.desc ? " ↓" : " ↑")}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((app) => (
              <Row
                key={app.id}
                app={app}
                statuses={statuses}
                save={(field, value) => save(app.id, field, value)}
                remove={() => remove(app)}
              />
            ))}
          </tbody>
        </table>
        {!shown.length && (
          <p className="px-4 py-10 text-center font-mono text-[14px] font-light text-muted">
            {apps.length ? "no applications match" : "no applications yet. add one above."}
          </p>
        )}
      </div>
    </main>
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
      className={`rounded-full px-3.5 py-1.5 text-[14px] transition-colors ${
        active ? "bg-ink text-canvas" : "bg-surface hover:bg-pill"
      }`}
    >
      {children} <span className={active ? "opacity-60" : "text-muted"}>{count}</span>
    </button>
  );
}

function Row({
  app,
  statuses,
  save,
  remove,
}: {
  app: Application;
  statuses: string[];
  save: (field: Field, value: string | boolean) => void;
  remove: () => void;
}) {
  const text = (field: Field, props: { type?: string; label: string; placeholder?: string }) => (
    <input
      // Remounts after a save is rolled back, so the input shows the old value.
      key={String(app[field])}
      type={props.type ?? "text"}
      defaultValue={app[field] as string}
      maxLength={MAX_LENGTH[field]}
      placeholder={props.placeholder}
      aria-label={`${props.label}, ${app.company}`}
      onBlur={(e) => save(field, e.target.value.trim())}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`${cellInput} placeholder:text-muted/60`}
    />
  );

  return (
    <tr className="border-b border-pill last:border-0 align-top">
      <td className="w-[13%] px-1 py-1 font-medium">{text("company", { label: "Company" })}</td>
      <td className="w-[15%] px-1 py-1">{text("title", { label: "Title" })}</td>
      <td className="px-1 py-1 text-center">
        <Check checked={app.referral} label={`Referral, ${app.company}`} onChange={(v) => save("referral", v)} />
      </td>
      <td className="w-[13%] px-1 py-1">
        <Status app={app} statuses={statuses} save={(v) => save("status", v)} />
      </td>
      <td className="w-[15%] px-1 py-1">
        {text("email", { type: "email", label: "Email used", placeholder: "email" })}
      </td>
      <td className="px-1 py-1">{text("appliedOn", { type: "date", label: "Date applied" })}</td>
      <td className="w-[12%] px-1 py-1">
        <div className="flex items-center">
          {text("link", { type: "url", label: "Link", placeholder: "https://" })}
          {app.link && (
            <a
              href={app.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${app.company} posting`}
              className="shrink-0 px-1.5 text-muted hover:text-ink"
            >
              ↗
            </a>
          )}
        </div>
      </td>
      <td className="w-[22%] px-1 py-1">
        <textarea
          key={app.notes}
          defaultValue={app.notes}
          rows={1}
          maxLength={MAX_LENGTH.notes}
          placeholder="notes"
          aria-label={`Notes, ${app.company}`}
          onBlur={(e) => save("notes", e.target.value)}
          className={`${cellInput} field-sizing-content resize-none placeholder:text-muted/60`}
        />
      </td>
      <td className="px-1 py-1 text-center">
        <Check checked={app.credsSaved} label={`Creds saved, ${app.company}`} onChange={(v) => save("credsSaved", v)} />
      </td>
      <td className="px-1 py-1">
        <button
          type="button"
          onClick={remove}
          aria-label={`Delete ${app.company}`}
          className="rounded-md px-2 py-1.5 text-muted transition-colors hover:bg-pill hover:text-ink"
        >
          ×
        </button>
      </td>
    </tr>
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
      className="mt-2 size-4 cursor-pointer accent-ink"
    />
  );
}

/** A menu of known statuses, with "Custom…" switching to a text field. */
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
    <select
      value={app.status}
      aria-label={`Status, ${app.company}`}
      onChange={(e) => (e.target.value === CUSTOM ? setCustom(true) : save(e.target.value))}
      className={`${cellInput} cursor-pointer`}
    >
      {statuses.map((status) => (
        <option key={status}>{status}</option>
      ))}
      <option value={CUSTOM}>Custom…</option>
    </select>
  );
}
