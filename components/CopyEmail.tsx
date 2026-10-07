"use client";

import { useState } from "react";
import MaskIcon from "./MaskIcon";

export default function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the address is still visible.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy email address ${email}`}
      className="inline-flex h-[2.4em] cursor-pointer items-center gap-[0.6em] rounded-[0.35em] border border-muted px-[0.9em] text-muted transition-colors hover:border-ink hover:bg-ink hover:text-white focus-visible:border-ink focus-visible:bg-ink focus-visible:text-white focus-visible:outline-none gators-button"
    >
      <span className="grid">
        <span
          className={`col-start-1 row-start-1 underline decoration-from-font [text-underline-position:from-font] ${copied ? "invisible" : ""}`}
        >
          {email}
        </span>
        <span
          className={`col-start-1 row-start-1 text-center ${copied ? "" : "invisible"}`}
        >
          copied!
        </span>
      </span>
      <MaskIcon src="/icons/copy.png" className="size-[1.2em]" />
      <span className="sr-only" aria-live="polite">
        {copied ? "Email copied to clipboard" : ""}
      </span>
    </button>
  );
}
