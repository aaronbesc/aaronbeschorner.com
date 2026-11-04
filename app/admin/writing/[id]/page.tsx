import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isOwner } from "@/auth";
import PostEditor from "@/components/PostEditor";
import { getPost } from "@/lib/db";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwner())) redirect("/admin/login");
  const { id } = await params;
  const post = /^\d{1,9}$/.test(id) ? await getPost(Number(id)) : null;
  if (!post) notFound();
  return <PostEditor initial={post} />;
}
