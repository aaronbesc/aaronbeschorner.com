"use client";

import { ArrowUpOnSquareIcon, CheckIcon } from "@heroicons/react/16/solid";
import { useEffect, useRef, useState } from "react";
import { useDictionary } from "./Locale";

// Share buttons for a post: the link, and the post as an Instagram story.
//
// Websites can't post to Instagram directly. On phones, the story image
// goes to the share sheet, where Instagram is one of the apps (it opens
// straight into a new story). On computers, the image is downloaded.
//
// Phones only open the share sheet during a tap, and fetching the image
// first can take longer than that. So on phones the image is fetched
// ahead of time, once, and shared from memory when the button is tapped.

const stories = new Map<string, Promise<File>>();

function loadStory(url: string, name: string) {
  let file = stories.get(url);
  if (!file) {
    file = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Story image: ${res.status}`);
        return res.blob();
      })
      .then((blob) => new File([blob], name, { type: "image/png" }));
    stories.set(url, file);
    file.catch(() => stories.delete(url));
  }
  return file;
}

/** A phone or tablet that can share files to other apps. */
const isPhone = () =>
  typeof navigator.canShare === "function" && matchMedia("(pointer: coarse)").matches;

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const isAbort = (error: unknown) => (error as Error)?.name === "AbortError";

type Status = "idle" | "copied" | "preparing" | "saved" | "again" | "failed";

const button =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-ink/15 px-3 text-[12px] text-muted-strong transition-colors hover:border-ink hover:bg-ink hover:text-surface focus-visible:border-ink focus-visible:bg-ink focus-visible:text-surface focus-visible:outline-none disabled:cursor-default";

/** The Instagram glyph: a rounded square, a lens and a dot. */
function StoryIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2" y="2" width="12" height="12" rx="3.5" />
      <circle cx="8" cy="8" r="2.8" />
      <circle cx="11.6" cy="4.4" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ShareButtons({
  url,
  title,
  storyUrl,
  slug,
}: {
  /** The post's full address. */
  url: string;
  title: string;
  /** The story image (app/og/writing/[slug]/story). */
  storyUrl: string;
  slug: string;
}) {
  const t = useDictionary().writing.share;
  const [link, setLink] = useState<Status>("idle");
  const [story, setStory] = useState<Status>("idle");
  const ready = useRef<File | null>(null);
  const name = `${slug}-story.png`;

  // Phones fetch the story image once the page has settled.
  useEffect(() => {
    if (!isPhone()) return;
    const timer = setTimeout(() => {
      loadStory(storyUrl, name)
        .then((file) => (ready.current = file))
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [storyUrl, name]);

  function flash(set: (s: Status) => void, status: Status) {
    set(status);
    setTimeout(() => set("idle"), 2000);
  }

  async function shareLink() {
    if (isPhone() && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Closing the share sheet is not an error worth showing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flash(setLink, "copied");
    } catch {
      flash(setLink, "failed");
    }
  }

  async function shareStory() {
    const phone = isPhone();
    const file = ready.current;
    if (phone && file && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch (error) {
        if (!isAbort(error)) flash(setStory, "failed");
      }
      return;
    }

    setStory("preparing");
    let loaded: File;
    try {
      loaded = await loadStory(storyUrl, name);
      ready.current = loaded;
    } catch {
      flash(setStory, "failed");
      return;
    }
    if (phone && navigator.canShare({ files: [loaded] })) {
      try {
        await navigator.share({ files: [loaded] });
        setStory("idle");
      } catch (error) {
        // The tap expired while the image loaded; it's ready now, so the
        // next tap opens the share sheet right away.
        if (isAbort(error)) setStory("idle");
        else flash(setStory, "again");
      }
      return;
    }
    download(loaded);
    flash(setStory, "saved");
  }

  const storyText = {
    idle: t.story,
    preparing: t.preparing,
    saved: t.saved,
    again: t.again,
    failed: t.failed,
    copied: t.story,
  }[story];

  return (
    <div role="group" aria-label={t.label} className="flex items-center gap-1.5">
      <button type="button" onClick={shareLink} className={button}>
        {link === "copied" ? (
          <CheckIcon aria-hidden className="size-3.5" />
        ) : (
          <ArrowUpOnSquareIcon aria-hidden className="size-3.5" />
        )}
        {link === "copied" ? t.copied : link === "failed" ? t.failed : t.link}
      </button>
      <button
        type="button"
        onClick={shareStory}
        disabled={story === "preparing"}
        aria-label={t.storyLabel}
        className={button}
      >
        <StoryIcon />
        {storyText}
      </button>
      <span className="sr-only" aria-live="polite">
        {link === "copied" ? t.copied : ""} {story === "idle" ? "" : storyText}
      </span>
    </div>
  );
}
