// Creates the job tracker's table. Safe to run again.
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
    email       text    NOT NULL DEFAULT '',
    applied_on  date,
    link        text    NOT NULL DEFAULT '',
    notes       text    NOT NULL DEFAULT '',
    creds_saved boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
  )
`;
console.log("applications table is ready.");
