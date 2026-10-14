"use server";

import { isOwner, signOut } from "@/auth";
import {
  DEFAULT_STATUS,
  FIELDS,
  cleanField,
  isField,
  type Application,
} from "@/lib/applications";
import { createApplication, deleteApplication, updateApplication } from "@/lib/db";

// Server actions are public endpoints, so each one checks the session and
// validates its input itself, whatever the page in front of it does.

async function requireOwner() {
  if (!(await isOwner())) throw new Error("Not authorized");
}

const isId = (id: unknown): id is number => Number.isSafeInteger(id) && (id as number) > 0;

export async function addApplication(input: { company: unknown; title: unknown }) {
  await requireOwner();
  const draft: Omit<Application, "id"> = {
    company: "",
    title: "",
    referral: false,
    status: DEFAULT_STATUS,
    email: "",
    appliedOn: new Date().toISOString().slice(0, 10),
    link: "",
    notes: "",
    startDate: "",
  };
  const given = { company: input.company, title: input.title };
  for (const field of FIELDS) {
    const value = cleanField(field, field in given ? given[field as keyof typeof given] : draft[field]);
    if (value === null) throw new Error(`Invalid ${field}`);
    (draft as Record<string, unknown>)[field] = value;
  }
  return createApplication(draft);
}

export async function editApplication(id: unknown, field: unknown, value: unknown) {
  await requireOwner();
  if (!isId(id) || !isField(field)) throw new Error("Invalid edit");
  const clean = cleanField(field, value);
  if (clean === null) throw new Error(`Invalid ${field}`);
  await updateApplication(id, field, clean);
}

export async function removeApplication(id: unknown) {
  await requireOwner();
  if (!isId(id)) throw new Error("Invalid id");
  await deleteApplication(id);
}

export async function logOut() {
  await signOut({ redirectTo: "/admin/login" });
}
