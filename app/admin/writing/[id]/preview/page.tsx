import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isOwner } from "@/auth";
import PostView from "@/components/PostView";
import { getPost } from "@/lib/db";

// A post as readers will see it, drafts included, from its last save.

export const metadata: Metadata = { title: "Preview" };

export default async function PreviewPost({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwner())) redirect("/admin/login");
  const { id } = await params;
  const post = /^\d{1,9}$/.test(id) ? await getPost(Number(id)) : null;
  if (!post) notFound();

  return (
    <div className="flex min-h-dvh flex-col items-center px-4">
      <p className="sticky top-3 z-10 mt-3 flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-[13px] text-canvas shadow-lg">
        <span>{post.published ? "Published" : "Draft"} preview, as last saved</span>
        <Link href={`/admin/writing/${post.id}`} className="underline decoration-from-font [text-underline-position:from-font] opacity-70 hover:opacity-100">
          Back to editor
        </Link>
      </p>
      <main className="w-full pt-12 pb-16 md:pt-16">
        <PostView post={post} lang="en" />
      </main>
    </div>
  );
}
