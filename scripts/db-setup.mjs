// Creates the job tracker's and the writing section's tables, or brings
// older ones up to date. Safe to run again.
//   npm run db:setup   (reads DATABASE_URL from .env.local)
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

const sql = neon(url);
await sql`
  CREATE TABLE IF NOT EXISTS applications (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company     text    NOT NULL,
    title       text    NOT NULL,
    referral    boolean NOT NULL DEFAULT false,
    status      text    NOT NULL DEFAULT 'Resume Screening',
    workplace   text    NOT NULL DEFAULT '',
    salary      integer,
    email       text    NOT NULL DEFAULT '',
    applied_on  date,
    link        text    NOT NULL DEFAULT '',
    notes       text    NOT NULL DEFAULT '',
    start_date  text,
    location    text    NOT NULL DEFAULT '',
    next_step   text    NOT NULL DEFAULT '',
    next_step_on date,
    source      text    NOT NULL DEFAULT '',
    contact     text    NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
  )
`;

// Start date replaced the "creds saved" checkbox. Text, since it can be a
// month (2027-01) as well as a day (2027-01-12).
await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS start_date text`;
await sql`ALTER TABLE applications DROP COLUMN IF EXISTS creds_saved`;

// Workplace (Remote, Hybrid, In-person) and yearly salary in euros.
await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS workplace text NOT NULL DEFAULT ''`;
await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS salary integer`;

// The details each application opens to.
await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT ''`;
await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS next_step text NOT NULL DEFAULT ''`;
await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS next_step_on date`;
await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT ''`;
await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS contact text NOT NULL DEFAULT ''`;

// Every status an application has been in, for the pipeline chart. Rows
// from before the history existed start with their current status.
await sql`
  CREATE TABLE IF NOT EXISTS status_changes (
    id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id integer NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
    status         text    NOT NULL,
    changed_at     timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`
  CREATE INDEX IF NOT EXISTS status_changes_application
  ON status_changes (application_id, changed_at)
`;
await sql`
  INSERT INTO status_changes (application_id, status, changed_at)
  SELECT id, status, created_at FROM applications a
  WHERE NOT EXISTS (SELECT 1 FROM status_changes c WHERE c.application_id = a.id)
`;

// Posts for the writing page (app/admin/writing). The cover and the body's
// blocks are JSON in the shape of lib/writings.ts; their images live in
// Vercel Blob.
await sql`
  CREATE TABLE IF NOT EXISTS posts (
    id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug         text    NOT NULL UNIQUE,
    title        text    NOT NULL,
    subtitle     text    NOT NULL DEFAULT '',
    author       text    NOT NULL,
    published_on date    NOT NULL,
    category     text    NOT NULL,
    topic        text    NOT NULL DEFAULT '',
    cover        jsonb,
    blocks       jsonb   NOT NULL DEFAULT '[]',
    published    boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`
  CREATE INDEX IF NOT EXISTS posts_published
  ON posts (published, published_on DESC)
`;

console.log("applications and posts tables are ready.");
