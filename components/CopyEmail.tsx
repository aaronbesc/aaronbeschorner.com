"use client";

import { useState } from "react";
import MaskIcon from "./MaskIcon";
import { useDictionary } from "./Locale";

export default function CopyEmail({ email }: { email: string }) {
  const { email: t } = useDictionary();
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

  // A pill as tall as the social icons beside it (size-[1.6em]), so the
  // row's edges line up.
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t.copy(email)}
      className="inline-flex h-[1.6em] cursor-pointer items-center gap-[0.45em] rounded-full border border-muted px-[0.7em] text-muted transition-colors hover:border-ink hover:bg-ink hover:text-surface focus-visible:border-ink focus-visible:bg-ink focus-visible:text-surface focus-visible:outline-none gators-button"
    >
      <span className="grid text-[0.8em]">
        <span className={`col-start-1 row-start-1 ${copied ? "invisible" : ""}`}>
          {email}
        </span>
        <span
          className={`col-start-1 row-start-1 text-center ${copied ? "" : "invisible"}`}
        >
          {t.copied}
        </span>
      </span>
      <MaskIcon src="/icons/copy.png" className="size-[0.8em]" />
      <span className="sr-only" aria-live="polite">
        {copied ? t.announced : ""}
      </span>
    </button>
  );
}
