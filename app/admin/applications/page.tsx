import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isOwner } from "@/auth";
import Tracker from "@/components/Tracker";
import { listApplications, listStatusChanges } from "@/lib/db";

export const metadata: Metadata = { title: "Applications" };

export default async function Applications() {
  if (!(await isOwner())) redirect("/admin/login");
  const [applications, history] = await Promise.all([listApplications(), listStatusChanges()]);
  return <Tracker initial={applications} initialHistory={history} />;
}
