import { neon } from "@neondatabase/serverless";
import type { Application, Field, StatusChange } from "@/lib/applications";

// The job tracker's tables in Neon Postgres: applications, and
// status_changes, every status each one has been in (for the pipeline chart). DATABASE_URL comes from the
// Neon integration on Vercel (and .env.local for local work); the table is
// created by scripts/db-setup.mjs. Only server code imports this file.

const sql = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
};

/** Each field's column. Column names are only ever taken from here. */
const COLUMNS: Record<Field, string> = {
  company: "company",
  title: "title",
  referral: "referral",
  status: "status",
  workplace: "workplace",
  salary: "salary",
  email: "email",
  appliedOn: "applied_on",
  link: "link",
  notes: "notes",
  startDate: "start_date",
  location: "location",
  nextStep: "next_step",
  nextStepOn: "next_step_on",
  source: "source",
  contact: "contact",
};

type Row = {
  id: number;
  company: string;
  title: string;
  referral: boolean;
  status: string;
  workplace: string;
  salary: string | null;
  email: string;
  applied_on: string | null;
  link: string;
  notes: string;
  start_date: string | null;
  location: string;
  next_step: string;
  next_step_on: string | null;
  source: string;
  contact: string;
};

const toApplication = (row: Row): Application => ({
  id: row.id,
  company: row.company,
  title: row.title,
  referral: row.referral,
  status: row.status,
  workplace: row.workplace,
  salary: row.salary ?? "",
  email: row.email,
  appliedOn: row.applied_on ?? "",
  link: row.link,
  notes: row.notes,
  startDate: row.start_date ?? "",
  location: row.location,
  nextStep: row.next_step,
  nextStepOn: row.next_step_on ?? "",
  source: row.source,
  contact: row.contact,
});

// Dates are read as text so they stay a plain YYYY-MM-DD, with no time
// zone shifting them a day; salary as text, like the app keeps it.
const SELECT = `id, company, title, referral, status, workplace,
  salary::text AS salary, email, applied_on::text AS applied_on, link, notes, start_date,
  location, next_step, next_step_on::text AS next_step_on, source, contact`;

export async function listApplications() {
  const rows = await sql().query(
    `SELECT ${SELECT} FROM applications
     ORDER BY applied_on DESC NULLS LAST, id DESC`,
  );
  return (rows as Row[]).map(toApplication);
}

export async function listStatusChanges() {
  const rows = await sql().query(
    `SELECT application_id AS "applicationId", status FROM status_changes
     ORDER BY changed_at, id`,
  );
  return rows as StatusChange[];
}

// Writes that touch the status also record it in status_changes, in the
// same statement so the two can't disagree.

export async function createApplication(app: Omit<Application, "id">) {
  const rows = await sql().query(
    `WITH created AS (
       INSERT INTO applications
         (company, title, referral, status, workplace, salary, email, applied_on, link,
          notes, start_date, location, next_step, next_step_on, source, contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING ${SELECT}
     ), history AS (
       INSERT INTO status_changes (application_id, status)
       SELECT id, status FROM created
     )
     SELECT * FROM created`,
    [
      app.company,
      app.title,
      app.referral,
      app.status,
      app.workplace,
      app.salary || null,
      app.email,
      app.appliedOn || null,
      app.link,
      app.notes,
      app.startDate || null,
      app.location,
      app.nextStep,
      app.nextStepOn || null,
      app.source,
      app.contact,
    ],
  );
  return toApplication((rows as Row[])[0]);
}

export async function updateApplication(id: number, field: Field, value: string | boolean) {
  // Empty dates and salaries are stored as NULL.
  const nullable =
    field === "appliedOn" || field === "startDate" || field === "nextStepOn" || field === "salary";
  const stored = nullable && value === "" ? null : value;
  if (field === "status") {
    await sql().query(
      `WITH updated AS (
         UPDATE applications SET status = $1, updated_at = now()
         WHERE id = $2 AND status <> $1
         RETURNING id
       )
       INSERT INTO status_changes (application_id, status)
       SELECT id, $1 FROM updated`,
      [stored, id],
    );
    return;
  }
  await sql().query(
    `UPDATE applications SET ${COLUMNS[field]} = $1, updated_at = now() WHERE id = $2`,
    [stored, id],
  );
}

export async function deleteApplication(id: number) {
  await sql().query(`DELETE FROM applications WHERE id = $1`, [id]);
}
