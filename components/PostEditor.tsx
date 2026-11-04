"use client";

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  PhotoIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/16/solid";
import { upload } from "@vercel/blob/client";
import NextImage from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ComponentProps,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { removePost, savePost } from "@/app/admin/writing/actions";
import DateField from "@/components/DateField";
import {
  CATEGORIES,
  IMAGE_TYPES,
  LIMITS,
  MAX_IMAGE_BYTES,
  categoryOf,
  slugify,
  type Block,
  type Post,
  type PostImage,
  type PostInput,
} from "@/lib/writings";

// The post editor (app/admin/writing/[id]).
//
// The whole post is edited here and saved at once (the Save button, or
// ⌘S / Ctrl S). The body is a list of blocks: Markdown text, or a set of
// images; blocks can be added between others, moved and removed. Images
// upload straight to Vercel Blob as soon as they're picked or dropped (see
// app/admin/writing/upload), and join the post when it's saved.

type ImagesBlock = Extract<Block, { type: "images" }>;
/** Where an upload goes: the cover, or an images block (by id). */
type Target = "cover" | string;
type Upload = { key: string; target: Target; progress: number };

const card =
  "rounded-2xl bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.05),0_10px_28px_-16px_rgb(0_0_0/0.25)] dark:ring-1 dark:ring-white/[0.06]";
const input =
  "w-full min-w-0 rounded-lg bg-canvas px-2.5 py-1.5 text-[13px] outline-none ring-ink/15 transition-shadow placeholder:text-muted/70 hover:ring-1 focus:ring-1";
const pillButton = "cursor-pointer rounded-full px-3 py-1.5 text-[13px] transition-colors hover:bg-pill";
const smallPill =
  "cursor-pointer rounded-full bg-surface px-2.5 py-1 text-[12px] text-muted-strong ring-1 ring-ink/10 transition-colors hover:text-ink hover:ring-ink/25";
const iconButton =
  "grid size-7 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-pill hover:text-ink disabled:pointer-events-none disabled:opacity-30";
const overlayButton =
  "grid cursor-pointer place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 disabled:pointer-events-none disabled:opacity-30";

const newId = () => Math.random().toString(36).slice(2, 10);

const toDraft = (post: Post): PostInput => ({
  slug: post.slug,
  title: post.title,
  subtitle: post.subtitle,
  author: post.author,
  date: post.date,
  category: post.category,
  topic: post.topic,
  cover: post.cover,
  blocks: post.blocks,
  published: post.published,
});

/**
 * A draft as a string, to tell whether it has changed since the last save.
 * Fields go in a fixed order, since Postgres doesn't keep JSON's.
 */
function snapshot(draft: PostInput) {
  const image = (i: PostImage) => [i.url, i.width, i.height, i.alt];
  return JSON.stringify([
    draft.slug,
    draft.title,
    draft.subtitle,
    draft.author,
    draft.date,
    draft.category,
    draft.topic,
    draft.published,
    draft.cover && image(draft.cover),
    draft.blocks.map((b) =>
      b.type === "text" ? [b.id, b.text] : [b.id, b.caption, b.wide, b.images.map(image)],
    ),
  ]);
}

/** An image's size, as browsers show it (turned upright from the camera's EXIF). */
function measure(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("browsers can't show this file"));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** "IMG 2041.JPG" → "img-2041.jpg", as the upload route accepts. */
const fileName = (file: File) =>
  file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^[-.]+|-+$/g, "")
    .slice(-80) || "image";

const move = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
};

/** Dropping image files onto an element. */
function useDrop(onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setOver(false);
        onFiles([...e.dataTransfer.files]);
      },
    },
  };
}

/** A button that opens the file picker for images. */
function FilePicker({
  multiple = false,
  onFiles,
  className = "",
  children,
  ...rest
}: {
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"label">, "children">) {
  return (
    <label
      {...rest}
      className={`cursor-pointer has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ink/30 ${className}`}
    >
      <input
        type="file"
        accept={IMAGE_TYPES.join(",")}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      {children}
    </label>
  );
}

/** A field with its name above it. */
function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] text-muted-strong">{label}</p>
      {children}
    </div>
  );
}

export default function PostEditor({ initial }: { initial: Post }) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [saved, setSaved] = useState(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(toDraft(initial)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  // A new post's address follows its title until it's published.
  const [autoSlug, setAutoSlug] = useState(
    () =>
      !initial.published &&
      (initial.slug.startsWith("untitled-") || initial.slug === slugify(initial.title)),
  );
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  const dirty = snapshot(draft) !== savedSnapshot;
  const topics = categoryOf(draft.category)?.topics ?? [];

  function set<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setTitle(title: string) {
    setDraft((d) => ({
      ...d,
      title,
      ...(autoSlug && slugify(title) ? { slug: slugify(title) } : {}),
    }));
  }

  // ---- Blocks ----

  function updateBlock(id: string, patch: Partial<Block>) {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
    }));
  }

  function insertBlock(at: number, type: Block["type"]) {
    const block: Block =
      type === "text"
        ? { id: newId(), type: "text", text: "" }
        : { id: newId(), type: "images", images: [], caption: "", wide: false };
    setDraft((d) => ({ ...d, blocks: [...d.blocks.slice(0, at), block, ...d.blocks.slice(at)] }));
  }

  function moveBlock(from: number, to: number) {
    setDraft((d) => ({ ...d, blocks: move(d.blocks, from, to) }));
  }

  function removeBlock(block: Block) {
    const hasContent = block.type === "text" ? block.text.trim() : block.images.length;
    if (hasContent && !confirm("Remove this block?")) return;
    setDraft((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== block.id) }));
  }

  // ---- Images ----

  async function uploadOne(target: Target, file: File) {
    if (!IMAGE_TYPES.includes(file.type)) {
      setError(`${file.name}: use a JPEG, PNG, WebP, AVIF or GIF image.`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`${file.name} is over ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
      return;
    }
    const key = newId();
    setUploads((u) => [...u, { key, target, progress: 0 }]);
    try {
      const size = await measure(file);
      const blob = await upload(`writing/${initial.id}/${fileName(file)}`, file, {
        access: "public",
        handleUploadUrl: "/admin/writing/upload",
        contentType: file.type,
        multipart: file.size > 8 * 1024 * 1024,
        onUploadProgress: ({ percentage }) =>
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: percentage } : x))),
      });
      const image: PostImage = { url: blob.url, ...size, alt: "" };
      setDraft((d) =>
        target === "cover"
          ? { ...d, cover: image }
          : {
              ...d,
              blocks: d.blocks.map((b) =>
                b.id === target && b.type === "images"
                  ? { ...b, images: [...b.images, image].slice(0, LIMITS.imagesPerBlock) }
                  : b,
              ),
            },
      );
    } catch (e) {
      setError(`${file.name}: ${(e as Error).message || "the upload failed"}.`);
    } finally {
      setUploads((u) => u.filter((x) => x.key !== key));
    }
  }

  const uploadTo = (target: Target, files: File[]) => {
    setError(null);
    return Promise.all(files.map((file) => uploadOne(target, file)));
  };

  // ---- Saving ----

  async function save() {
    if (saving) return false;
    setSaving(true);
    setError(null);
    const sent = latest.current;
    try {
      const result = await savePost(initial.id, sent);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      const clean = toDraft(result.post);
      setSaved(result.post);
      setSavedSnapshot(snapshot(clean));
      if (result.post.published) setAutoSlug(false);
      // Show the cleaned-up post (trimmed text), unless it changed meanwhile.
      if (latest.current === sent) setDraft(clean);
      return true;
    } catch {
      setError("Couldn't save. Check the connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  /** Saves first if needed, then opens the preview in a new tab. */
  async function preview() {
    // Opened right away, while the click still allows a new tab.
    const tab = window.open("", "_blank");
    if (dirty && !(await save())) {
      tab?.close();
      return;
    }
    const url = `/admin/writing/${initial.id}/preview`;
    if (tab) tab.location.href = url;
    else router.push(url);
  }

  async function destroy() {
    if (!confirm(`Delete “${draft.title}”? Its images are deleted too. This can't be undone.`)) {
      return;
    }
    await removePost(initial.id);
  }

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key.toLowerCase() === "s" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void save();
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Closing the tab or reloading with unsaved changes asks first.
  useEffect(() => {
    if (!dirty && !uploads.length) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, uploads.length]);

  function leave(e: MouseEvent) {
    if (dirty && !confirm("Leave without saving your changes?")) e.preventDefault();
  }

  const status = uploads.length
    ? `Uploading ${uploads.length} ${uploads.length === 1 ? "image" : "images"}`
    : saving
      ? "Saving"
      : dirty
        ? "Unsaved changes"
        : "Saved";
  const coverUpload = uploads.find((u) => u.target === "cover");

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-20 border-b border-ink/[0.06] bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link
            href="/admin/writing"
            onClick={leave}
            className="font-mono text-[12px] font-light text-muted transition-colors hover:text-ink"
          >
            ← writing
          </Link>
          <div className="flex items-center gap-1">
            <p aria-live="polite" className={`mr-2 hidden font-mono text-[12px] font-light sm:block ${dirty ? "text-ink" : "text-muted"}`}>
              {status}
            </p>
            <button type="button" onClick={preview} className={pillButton}>
              Preview
            </button>
            {saved.published && (
              <a href={`/writing/${saved.slug}`} target="_blank" rel="noopener" className={pillButton}>
                View
              </a>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="ml-1 cursor-pointer rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-canvas transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-35"
            >
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="flex items-center justify-center gap-2 bg-rose-100 px-4 py-2 text-center text-[13px] text-rose-800 dark:bg-rose-400/15 dark:text-rose-300">
            {error}
            <button type="button" aria-label="Dismiss" onClick={() => setError(null)} className="cursor-pointer opacity-60 hover:opacity-100">
              <XMarkIcon className="size-4" />
            </button>
          </p>
        )}
      </div>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label="Post" className="min-w-0">
          <textarea
            value={draft.title}
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
            placeholder="Title"
            aria-label="Title"
            rows={1}
            maxLength={LIMITS.title}
            className="block w-full resize-none bg-transparent text-[30px] leading-[1.15] font-medium tracking-[-0.02em] text-fg outline-none [field-sizing:content] placeholder:text-muted/50 md:text-[38px]"
          />
          <textarea
            value={draft.subtitle}
            onChange={(e) => set("subtitle", e.target.value.replace(/\n/g, " "))}
            placeholder="Subtitle (optional)"
            aria-label="Subtitle"
            rows={1}
            maxLength={LIMITS.subtitle}
            className="mt-3 block w-full resize-none bg-transparent text-[18px] leading-[1.45] text-muted-strong outline-none [field-sizing:content] placeholder:text-muted/50 md:text-[20px]"
          />

          <CoverField
            cover={draft.cover}
            progress={coverUpload?.progress}
            onFiles={(files) => uploadTo("cover", files.slice(0, 1))}
            onChange={(cover) => set("cover", cover)}
          />

          <div className="mt-6">
            {draft.blocks.map((block, i) => (
              <div key={block.id}>
                <Inserter onAdd={(type) => insertBlock(i, type)} />
                <div className={`${card} p-4 sm:p-5`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-light text-muted">
                      {block.type === "text" ? "text" : "images"}
                    </span>
                    <div className="-mr-1.5 flex">
                      <button type="button" aria-label="Move block up" disabled={i === 0} onClick={() => moveBlock(i, i - 1)} className={iconButton}>
                        <ChevronUpIcon className="size-4" />
                      </button>
                      <button type="button" aria-label="Move block down" disabled={i === draft.blocks.length - 1} onClick={() => moveBlock(i, i + 1)} className={iconButton}>
                        <ChevronDownIcon className="size-4" />
                      </button>
                      <button type="button" aria-label="Remove block" onClick={() => removeBlock(block)} className={iconButton}>
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  {block.type === "text" ? (
                    <textarea
                      value={block.text}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      placeholder="Write here. Markdown works, see Formatting on the right."
                      aria-label="Text"
                      rows={5}
                      maxLength={LIMITS.text}
                      className="block min-h-32 w-full resize-y bg-transparent text-[16px] leading-[1.7] outline-none [field-sizing:content] placeholder:text-muted/60"
                    />
                  ) : (
                    <ImagesField
                      block={block}
                      uploads={uploads.filter((u) => u.target === block.id)}
                      onChange={(patch) => updateBlock(block.id, patch)}
                      onFiles={(files) => uploadTo(block.id, files)}
                    />
                  )}
                </div>
              </div>
            ))}
            <div className="mt-4 flex items-center justify-center gap-2">
              <button type="button" onClick={() => insertBlock(draft.blocks.length, "text")} className={smallPill}>
                + Text
              </button>
              <button type="button" onClick={() => insertBlock(draft.blocks.length, "images")} className={smallPill}>
                + Images
              </button>
            </div>
          </div>
        </section>

        <aside aria-label="Settings" className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <div className={`${card} flex flex-col gap-4 p-5`}>
            <label className="flex cursor-pointer items-start justify-between gap-3">
              <span>
                <span className="block text-[14px] font-medium">Published</span>
                <span className="block text-[12px] text-muted-strong">
                  {draft.published ? "On the writing page once saved." : "A draft only you can see."}
                </span>
              </span>
              <span className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full bg-ink/15 transition-colors has-checked:bg-emerald-500 has-focus-visible:ring-2 has-focus-visible:ring-ink/30">
                <input
                  type="checkbox"
                  role="switch"
                  checked={draft.published}
                  onChange={(e) => set("published", e.target.checked)}
                  className="peer absolute inset-0 cursor-pointer opacity-0"
                />
                <span className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
              </span>
            </label>

            <hr className="border-ink/[0.06]" />

            <Labeled label="Address">
              <div className="flex items-center rounded-lg bg-canvas ring-ink/15 transition-shadow focus-within:ring-1 hover:ring-1">
                <span className="pl-2.5 font-mono text-[12px] font-light text-muted">/writing/</span>
                <input
                  value={draft.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  }}
                  onBlur={() => set("slug", slugify(draft.slug) || slugify(draft.title))}
                  aria-label="Address"
                  maxLength={LIMITS.slug}
                  className="w-full min-w-0 bg-transparent py-1.5 pr-2.5 font-mono text-[12px] outline-none"
                />
              </div>
              {saved.published && draft.slug !== saved.slug && (
                <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
                  Links already shared to /writing/{saved.slug} will stop working.
                </p>
              )}
            </Labeled>

            <Labeled label="Date">
              <DateField value={draft.date} onChange={(v) => v && set("date", v)} ariaLabel="Date" />
            </Labeled>

            <Labeled label="Author">
              <input
                value={draft.author}
                onChange={(e) => set("author", e.target.value)}
                aria-label="Author"
                maxLength={LIMITS.author}
                className={input}
              />
            </Labeled>

            <div className="grid grid-cols-2 gap-3">
              <Labeled label="Category">
                <select
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value, topic: "" }))}
                  aria-label="Category"
                  className={`${input} cursor-pointer`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label.en}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label="Topic">
                <select
                  value={draft.topic}
                  onChange={(e) => set("topic", e.target.value)}
                  aria-label="Topic"
                  className={`${input} cursor-pointer`}
                >
                  <option value="">none</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label.en}
                    </option>
                  ))}
                </select>
              </Labeled>
            </div>
          </div>

          <div className={`${card} p-5`}>
            <p className="text-[11px] text-muted-strong">Formatting</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px] font-light">
              {[
                ["## Title", "heading"],
                ["**word**", "bold"],
                ["*word*", "italic"],
                ["[text](https://site.com)", "link"],
                ["> text", "quote"],
                ["- item", "list"],
                ["---", "divider"],
              ].map(([syntax, name]) => (
                <div key={name} className="contents">
                  <dt className="text-ink">{syntax}</dt>
                  <dd className="text-muted">{name}</dd>
                </div>
              ))}
            </dl>
          </div>

          <button
            type="button"
            onClick={destroy}
            className="cursor-pointer self-end rounded-full px-3 py-1 text-[12px] text-muted transition-colors hover:bg-pill hover:text-rose-700 dark:hover:text-rose-300"
          >
            Delete post
          </button>
        </aside>
      </main>
    </div>
  );
}

/** Adds a block between two others; shows on hover (always, on touch screens). */
function Inserter({ onAdd }: { onAdd: (type: Block["type"]) => void }) {
  return (
    <div className="flex h-9 items-center gap-2 opacity-0 transition-opacity focus-within:opacity-100 hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
      <span className="h-px flex-1 bg-ink/10" />
      <button type="button" onClick={() => onAdd("text")} className={smallPill}>
        + Text
      </button>
      <button type="button" onClick={() => onAdd("images")} className={smallPill}>
        + Images
      </button>
      <span className="h-px flex-1 bg-ink/10" />
    </div>
  );
}

/** The wide image under the title, cropped as the post shows it. */
function CoverField({
  cover,
  progress,
  onFiles,
  onChange,
}: {
  cover: PostImage | null;
  progress: number | undefined;
  onFiles: (files: File[]) => void;
  onChange: (cover: PostImage | null) => void;
}) {
  const drop = useDrop((files) => onFiles(files));
  const uploading = progress !== undefined;

  if (!cover) {
    return (
      <FilePicker
        onFiles={onFiles}
        {...drop.props}
        className={`mt-8 flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-center transition-colors md:aspect-[12/5] ${
          drop.over ? "border-ink/50 bg-ink/[0.04] text-ink" : "border-ink/20 text-muted hover:border-ink/40 hover:text-ink"
        }`}
      >
        <PhotoIcon aria-hidden className="size-5" />
        <span className="text-[14px]">
          {uploading ? `Uploading ${Math.round(progress)}%` : "Add a cover image"}
        </span>
        <span className="font-mono text-[11px] font-light text-muted">
          optional, wide images work best
        </span>
      </FilePicker>
    );
  }

  return (
    <div className="mt-8">
      <div {...drop.props} className={`relative aspect-[16/9] overflow-hidden rounded-2xl bg-ink/5 md:aspect-[12/5] ${drop.over ? "ring-2 ring-ink/40" : ""}`}>
        <NextImage src={cover.url} alt="" fill sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-black/40 font-mono text-[13px] text-white">
            {Math.round(progress)}%
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-1.5">
          <FilePicker onFiles={onFiles} className={`${overlayButton} px-3 py-1 text-[12px]`}>
            Replace
          </FilePicker>
          <button type="button" onClick={() => onChange(null)} className={`${overlayButton} px-3 py-1 text-[12px]`}>
            Remove
          </button>
        </div>
      </div>
      <input
        value={cover.alt}
        onChange={(e) => onChange({ ...cover, alt: e.target.value })}
        placeholder="Describe the cover for people who can't see it"
        aria-label="Cover description"
        maxLength={LIMITS.alt}
        // On the page, not in a card, so it takes the card color to show.
        className={`${input.replace("bg-canvas", "bg-surface")} mt-2`}
      />
    </div>
  );
}

/** An images block: its images (reorderable, each with a description), caption and width. */
function ImagesField({
  block,
  uploads,
  onChange,
  onFiles,
}: {
  block: ImagesBlock;
  uploads: Upload[];
  onChange: (patch: Partial<ImagesBlock>) => void;
  onFiles: (files: File[]) => void;
}) {
  const room = LIMITS.imagesPerBlock - block.images.length - uploads.length;
  const add = (files: File[]) => room > 0 && onFiles(files.slice(0, room));
  const drop = useDrop(add);
  const setImages = (images: PostImage[]) => onChange({ images });

  return (
    <div {...drop.props} className={`rounded-xl transition-shadow ${drop.over ? "ring-2 ring-ink/30 ring-offset-4 ring-offset-surface" : ""}`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {block.images.map((image, i) => (
          <div key={image.url} className="min-w-0">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-ink/5">
              <NextImage src={image.url} alt="" fill sizes="240px" className="object-cover" />
              <div className="absolute inset-x-1.5 top-1.5 flex justify-between transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <div className="flex gap-1">
                  <button type="button" aria-label="Move image left" disabled={i === 0} onClick={() => setImages(move(block.images, i, i - 1))} className={`${overlayButton} size-6`}>
                    <ChevronLeftIcon className="size-3.5" />
                  </button>
                  <button type="button" aria-label="Move image right" disabled={i === block.images.length - 1} onClick={() => setImages(move(block.images, i, i + 1))} className={`${overlayButton} size-6`}>
                    <ChevronRightIcon className="size-3.5" />
                  </button>
                </div>
                <button type="button" aria-label="Remove image" onClick={() => setImages(block.images.filter((_, j) => j !== i))} className={`${overlayButton} size-6`}>
                  <XMarkIcon className="size-3.5" />
                </button>
              </div>
            </div>
            <input
              value={image.alt}
              onChange={(e) => setImages(block.images.map((img, j) => (j === i ? { ...img, alt: e.target.value } : img)))}
              placeholder="Description"
              aria-label={`Image ${i + 1} description`}
              maxLength={LIMITS.alt}
              className={`${input} mt-1.5 text-[12px]`}
            />
          </div>
        ))}
        {uploads.map((u) => (
          <div key={u.key} className="grid aspect-[4/3] place-items-center rounded-xl bg-ink/5 font-mono text-[12px] font-light text-muted">
            {Math.round(u.progress)}%
          </div>
        ))}
        {room > 0 && (
          <FilePicker
            multiple
            onFiles={add}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink/20 text-muted transition-colors hover:border-ink/40 hover:text-ink"
          >
            <PhotoIcon aria-hidden className="size-4" />
            <span className="text-[12px]">Add images</span>
            <span className="font-mono text-[10px] font-light">or drop them here</span>
          </FilePicker>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <input
          value={block.caption}
          onChange={(e) => onChange({ caption: e.target.value })}
          placeholder="Caption (optional)"
          aria-label="Caption"
          maxLength={LIMITS.caption}
          className={`${input} flex-1 basis-48`}
        />
        <label className="flex cursor-pointer items-center gap-2 text-[13px]" title="Wider than the text on large screens">
          <input
            type="checkbox"
            checked={block.wide}
            onChange={(e) => onChange({ wide: e.target.checked })}
            className="size-4 cursor-pointer accent-ink"
          />
          Wide
        </label>
      </div>
    </div>
  );
}
