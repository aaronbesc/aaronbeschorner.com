import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isOwner } from "@/auth";
import Tracker from "@/components/Tracker";
import { listApplications } from "@/lib/db";

export const metadata: Metadata = { title: "Applications · Aaron Beschorner" };

export default async function Applications() {
  if (!(await isOwner())) redirect("/admin/login");
  const applications = await listApplications();
  return <Tracker initial={applications} />;
}
