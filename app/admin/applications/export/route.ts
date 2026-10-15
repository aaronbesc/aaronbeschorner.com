import { isOwner } from "@/auth";
import { FIELDS } from "@/lib/applications";
import { listApplications } from "@/lib/db";

// The tracker as a CSV download.

export const dynamic = "force-dynamic";

const HEADERS = [
  "Company",
  "Title",
  "Referral",
  "Status",
  "Workplace",
  "Salary (EUR)",
  "Email used",
  "Date applied",
  "Link",
  "Notes",
  "Start date",
];

function cell(value: string | boolean) {
  let text = typeof value === "boolean" ? (value ? "yes" : "no") : value;
  // A leading = + - @ would run as a formula in Excel or Sheets.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET() {
  if (!(await isOwner())) return new Response("Not found", { status: 404 });

  const rows = await listApplications();
  const csv = [HEADERS, ...rows.map((row) => FIELDS.map((field) => row[field]))]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(`﻿${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="applications-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
