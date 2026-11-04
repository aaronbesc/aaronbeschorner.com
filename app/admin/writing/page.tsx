import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isOwner } from "@/auth";
import { logOut } from "@/app/admin/actions";
import { newPost } from "@/app/admin/writing/actions";
import { listPosts } from "@/lib/db";
import { kicker, longDate } from "@/lib/writings";

// Every post, drafts too. Each opens in the editor.

export const metadata: Metadata = { title: "Writing" };

const pillButton = "rounded-full px-3 py-1.5 text-[13px] transition-colors hover:bg-pill";

export default async function Writing() {
  if (!(await isOwner())) redirect("/admin/login");
  const posts = await listPosts();
  const published = posts.filter((post) => post.published).length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="font-mono text-[12px] font-light text-muted transition-colors hover:text-ink">
            ← admin
          </Link>
          <h1 className="mt-1 text-[26px] font-medium">Writing</h1>
          <p className="mt-1 font-mono text-[13px] font-light text-muted">
            {published} published, {posts.length - published}{" "}
            {posts.length - published === 1 ? "draft" : "drafts"}
          </p>
        </div>
        <div className="-mr-3 flex items-center gap-1">
          <form action={newPost}>
            <button
              type="submit"
              className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-canvas transition-opacity hover:opacity-80"
            >
              New post
            </button>
          </form>
          <form action={logOut}>
            <button type="submit" className={`${pillButton} text-muted hover:text-ink`}>
              Sign out
            </button>
          </form>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="mt-16 text-center font-mono text-[13px] font-light text-muted">
          No posts yet. Start one with New post.
        </p>
      ) : (
        <ul className="mt-8 overflow-hidden rounded-2xl bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.05),0_10px_28px_-16px_rgb(0_0_0/0.25)] dark:ring-1 dark:ring-white/[0.06]">
          {posts.map((post) => (
            <li key={post.id} className="border-b border-ink/[0.06] last:border-0">
              <Link
                href={`/admin/writing/${post.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors outline-none hover:bg-ink/[0.03] focus-visible:bg-ink/[0.04] sm:grid-cols-[7rem_1fr_auto]"
              >
                <span className="flex flex-wrap gap-x-3 font-mono text-[12px] font-light text-muted max-sm:order-2 max-sm:col-span-2 sm:flex-col">
                  <span>{longDate(post.date, "en", "short")}</span>
                  <span>{kicker(post, "en")}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px]">{post.title}</span>
                  {post.subtitle && (
                    <span className="block truncate text-[13px] text-muted-strong">{post.subtitle}</span>
                  )}
                </span>
                {/* The tracker's pill colors (lib/status.ts). */}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[12px] ${
                    post.published
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
                      : "bg-stone-200 text-stone-700 dark:bg-stone-400/15 dark:text-stone-300"
                  }`}
                >
                  {post.published ? "Published" : "Draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
