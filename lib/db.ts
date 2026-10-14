import { neon } from "@neondatabase/serverless";
import type { Application, Field } from "@/lib/applications";

// The job tracker's table in Neon Postgres. DATABASE_URL comes from the
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
  email: "email",
  appliedOn: "applied_on",
  link: "link",
  notes: "notes",
  credsSaved: "creds_saved",
};

type Row = {
  id: number;
  company: string;
  title: string;
  referral: boolean;
  status: string;
  email: string;
  applied_on: string | null;
  link: string;
  notes: string;
  creds_saved: boolean;
};

const toApplication = (row: Row): Application => ({
  id: row.id,
  company: row.company,
  title: row.title,
  referral: row.referral,
  status: row.status,
  email: row.email,
  appliedOn: row.applied_on ?? "",
  link: row.link,
  notes: row.notes,
  credsSaved: row.creds_saved,
});

// applied_on is read as text so it stays a plain YYYY-MM-DD, with no time
// zone shifting it a day.
const SELECT = `id, company, title, referral, status, email,
  applied_on::text AS applied_on, link, notes, creds_saved`;

export async function listApplications() {
  const rows = await sql().query(
    `SELECT ${SELECT} FROM applications
     ORDER BY applied_on DESC NULLS LAST, id DESC`,
  );
  return (rows as Row[]).map(toApplication);
}

export async function createApplication(app: Omit<Application, "id">) {
  const rows = await sql().query(
    `INSERT INTO applications
       (company, title, referral, status, email, applied_on, link, notes, creds_saved)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${SELECT}`,
    [
      app.company,
      app.title,
      app.referral,
      app.status,
      app.email,
      app.appliedOn || null,
      app.link,
      app.notes,
      app.credsSaved,
    ],
  );
  return toApplication((rows as Row[])[0]);
}

export async function updateApplication(id: number, field: Field, value: string | boolean) {
  const stored = field === "appliedOn" && value === "" ? null : value;
  await sql().query(
    `UPDATE applications SET ${COLUMNS[field]} = $1, updated_at = now() WHERE id = $2`,
    [stored, id],
  );
}

export async function deleteApplication(id: number) {
  await sql().query(`DELETE FROM applications WHERE id = $1`, [id]);
}
