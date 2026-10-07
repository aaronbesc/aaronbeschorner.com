"use client";

import Image from "next/image";
import { useState } from "react";

export default function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the mailto link still works.
    }
  }

  return (
    <div className="flex h-[42px] w-[285px] max-w-full items-center justify-between rounded-[5px] border border-muted pr-[12px] pl-[18px]">
      <a
        href={`mailto:${email}`}
        className="truncate text-[16px] text-muted underline decoration-from-font [text-underline-position:from-font] hover:text-ink"
      >
        {email}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Email copied" : "Copy email address"}
        title={copied ? "Copied!" : "Copy email"}
        className="shrink-0 cursor-pointer transition-opacity hover:opacity-70"
      >
        <Image
          src="/icons/copy.png"
          alt=""
          width={24}
          height={24}
          className={copied ? "opacity-40" : undefined}
        />
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Email copied to clipboard" : ""}
      </span>
    </div>
  );
}
