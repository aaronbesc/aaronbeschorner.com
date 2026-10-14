// Job applications, shared by the tracker's server and client code. The
// rows themselves live in Postgres (see lib/db.ts), never in the repo.

export type Application = {
  id: number;
  company: string;
  title: string;
  referral: boolean;
  status: string;
  email: string;
  /** YYYY-MM-DD, or "" when not set. */
  appliedOn: string;
  link: string;
  notes: string;
  /** Whether this portal's login is saved in the password manager. */
  credsSaved: boolean;
};

/** Fields that can be edited after a row is created. */
export type Field = Exclude<keyof Application, "id">;

/** Offered in the status menu; any other text is a custom status. */
export const PRESET_STATUSES = [
  "Resume Screening",
  "Interview Offered",
  "Rejected",
  "Offer",
  "Ghosted",
];

export const DEFAULT_STATUS = PRESET_STATUSES[0];

/** Column limits, so a stray paste can't fill the database. */
export const MAX_LENGTH: Partial<Record<Field, number>> = {
  company: 200,
  title: 200,
  status: 60,
  email: 320,
  link: 2000,
  notes: 5000,
};

/**
 * Checks one field's value from the browser and returns it cleaned up, or
 * null if it isn't valid for that field.
 */
export function cleanField(field: Field, value: unknown) {
  switch (field) {
    case "referral":
    case "credsSaved":
      return typeof value === "boolean" ? value : null;
    case "appliedOn":
      if (value === "") return "";
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value))
        ? value
        : null;
    case "link": {
      if (typeof value !== "string") return null;
      const link = value.trim();
      // Only web links, so a "javascript:" URL can't end up in an href.
      if (link && !/^https?:\/\//i.test(link)) return null;
      return link.length <= MAX_LENGTH.link! ? link : null;
    }
    default: {
      if (typeof value !== "string") return null;
      const text = field === "notes" ? value : value.trim();
      if (text.length > MAX_LENGTH[field]!) return null;
      if ((field === "company" || field === "title" || field === "status") && !text) {
        return null;
      }
      return text;
    }
  }
}

export const FIELDS: Field[] = [
  "company",
  "title",
  "referral",
  "status",
  "email",
  "appliedOn",
  "link",
  "notes",
  "credsSaved",
];

export const isField = (value: unknown): value is Field =>
  (FIELDS as unknown[]).includes(value);
