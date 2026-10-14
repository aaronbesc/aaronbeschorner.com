import { redirect } from "next/navigation";
import { isOwner, signIn } from "@/auth";

type Props = { searchParams: Promise<{ error?: string }> };

const button =
  "rounded-full bg-ink px-5 py-2.5 text-[15px] font-medium text-canvas transition-opacity hover:opacity-80";

export default async function Login({ searchParams }: Props) {
  if (await isOwner()) redirect("/admin/applications");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="font-mono text-[15px] font-light text-muted">
        <span className="text-ink">$</span> sudo open applications
        <br />
        {error ? "access denied" : "authentication required"}
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/admin/applications" });
        }}
      >
        <button type="submit" className={button}>
          Sign in with GitHub
        </button>
      </form>
    </main>
  );
}
