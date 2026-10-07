import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-[15px] font-light text-muted">
        <span className="text-ink">$</span> cd {"<this page>"}
        <br />
        no such file or directory
      </p>
      <Link
        href="/"
        className="mt-6 text-[20px] underline decoration-from-font [text-underline-position:from-font]"
      >
        Back home
      </Link>
    </main>
  );
}
