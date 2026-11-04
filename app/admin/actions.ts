"use server";

import { signOut } from "@/auth";

// Shared by every private page.
export async function logOut() {
  await signOut({ redirectTo: "/admin/login" });
}
