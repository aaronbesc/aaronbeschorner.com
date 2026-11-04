import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isOwner } from "@/auth";
import { logOut } from "@/app/admin/actions";
import { countAll } from "@/lib/db";

// The admin home: a door to each private tool.

export const metadata: Metadata = { title: "Admin" };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const card =
  "group flex flex-col rounded-2xl bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_10px_28px_-16px_rgb(0_0_0/0.25)] transition-shadow outline-none hover:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_16px_36px_-16px_rgb(0_0_0/0.35)] focus-visible:ring-2 focus-visible:ring-ink/20 dark:ring-1 dark:ring-white/[0.06]";

export default async function Admin() {
  if (!(await isOwner())) redirect("/admin/login");
  const counts = await countAll();

  const tools = [
    {
      href: "/admin/applications",
      title: "Applications",
      description: "The job application tracker.",
      stat: plural(counts.applications, "application", "applications"),
    },
    {
      href: "/admin/writing",
      title: "Writing",
      description: "Write, edit and publish posts for the writing page.",
      stat: `${counts.published} published, ${plural(counts.drafts, "draft", "drafts")}`,
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-medium">Admin</h1>
          <p className="mt-1 font-mono text-[13px] font-light text-muted">
            <span className="text-ink">$</span> ls ~/tools
          </p>
        </div>
        <form action={logOut} className="-mr-3">
          <button
            type="submit"
            className="rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-pill hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </header>

      <nav aria-label="Tools" className="mt-8 grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className={card}>
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[18px] font-medium">{tool.title}</span>
              <span
                aria-hidden
                className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
              >
                →
              </span>
            </span>
            <span className="mt-1 text-[14px] text-muted-strong">{tool.description}</span>
            <span className="mt-6 font-mono text-[12px] font-light text-muted">{tool.stat}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
