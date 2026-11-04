import Image from "next/image";
import type { ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import type { Locale } from "@/lib/i18n";
import { DICTIONARIES } from "@/lib/i18n";
import {
  kicker,
  longDate,
  readingMinutes,
  type Block,
  type Post,
  type PostImage,
} from "@/lib/writings";

// A post as readers see it, on its page (app/[lang]/writing/[slug]) and in
// the editor's preview (app/admin/writing/[id]/preview).
//
// The article is a three-column grid: text sits in the middle column,
// about 70 characters wide, and wide images and the cover span all three,
// up to the page's 64rem. Every image, whatever its shape or format, sits
// in the same container: rounded corners and a soft placeholder tint
// while it loads.

const TEXT_PX = 672; // 42rem, the text column
const WIDE_PX = 1024; // 64rem, wide images and the cover
const frame = "relative overflow-hidden rounded-2xl bg-ink/5";

const link =
  "underline decoration-ink/30 decoration-from-font [text-underline-position:from-font] transition-colors hover:decoration-ink";

// Markdown, set in the site's type. One h1 per page (the title), so
// headings in the text start at h2. Raw HTML in the text is never
// rendered, and images belong in image blocks, so Markdown images are
// dropped.
const MARKDOWN: Components = {
  h1: ({ children }) => <h2 className="mt-12 text-[22px] leading-snug font-medium text-fg md:text-[24px]">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-12 text-[22px] leading-snug font-medium text-fg md:text-[24px]">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-9 text-[18px] leading-snug font-medium text-fg md:text-[19px]">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-8 font-medium text-fg">{children}</h4>,
  p: ({ children }) => <p className="mt-6 first:mt-0">{children}</p>,
  a: ({ href = "", children }) => {
    const external = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className={link}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="font-medium text-fg">{children}</strong>,
  ul: ({ children }) => <ul className="mt-6 list-disc space-y-2 pl-5 marker:text-muted">{children}</ul>,
  ol: ({ children }) => <ol className="mt-6 list-decimal space-y-2 pl-5 marker:text-muted">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="mt-8 border-l-2 border-ink/15 pl-5 text-muted-strong">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mt-6 overflow-x-auto rounded-2xl bg-ink/[0.04] p-4 font-mono text-[13px] leading-relaxed [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="mx-auto my-12 w-16 border-ink/15" />,
};

/** Splits images into rows of at most three, as even as they go (4 → 2 + 2, 5 → 3 + 2). */
function rowsOf(images: PostImage[]) {
  const count = Math.ceil(images.length / 3);
  const rows: PostImage[][] = [];
  for (let r = 0, i = 0; r < count; r++) {
    const size = Math.ceil((images.length - i) / (count - r));
    rows.push(images.slice(i, i + size));
    i += size;
  }
  return rows;
}

/**
 * A block of images. Each row is justified: images share one height, each
 * as wide as its shape needs, so portraits and landscapes sit together
 * without cropping. A row is never taller than 80% of the screen.
 */
function Images({ block }: { block: Extract<Block, { type: "images" }> }) {
  if (!block.images.length) return null;
  const columnPx = block.wide ? WIDE_PX : TEXT_PX;
  return (
    <figure className={block.wide ? "col-span-full mt-12" : "col-start-2 mt-10"}>
      <div className="flex flex-col gap-2 md:gap-3">
        {rowsOf(block.images).map((row) => {
          const shape = row.reduce((sum, image) => sum + image.width / image.height, 0);
          return (
            <div
              key={row[0].url}
              className="mx-auto flex w-full gap-2 md:gap-3"
              style={{ maxWidth: `calc(80svh * ${shape.toFixed(3)})` }}
            >
              {row.map((image) => {
                const share = image.width / image.height / shape;
                return (
                  <div
                    key={image.url}
                    className={frame}
                    style={{
                      flex: `${(share * 100).toFixed(3)} 1 0%`,
                      aspectRatio: `${image.width} / ${image.height}`,
                    }}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt}
                      fill
                      sizes={`(min-width: ${columnPx + 32}px) ${Math.ceil(columnPx * share)}px, ${Math.ceil(100 * share)}vw`}
                      className="object-cover"
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {block.caption && (
        <figcaption className="mt-3 font-mono text-[11px] font-light text-muted lg:text-xs">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

export default function PostView({
  post,
  lang,
  share,
  footer,
}: {
  post: Post;
  lang: Locale;
  /** Share buttons, beside the byline. */
  share?: ReactNode;
  /** Under the article, such as a link back to the list. */
  footer?: ReactNode;
}) {
  const t = DICTIONARIES[lang].writing;
  return (
    <article className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)_min(42rem,100%)_minmax(0,1fr)]">
      <header className="col-start-2">
        <p className="font-mono text-[11px] font-light text-muted lg:text-xs">{kicker(post, lang)}</p>
        <h1 className="mt-3 text-[30px] leading-[1.1] font-medium tracking-[-0.02em] text-balance text-fg md:text-[42px]">
          {post.title}
        </h1>
        {post.subtitle && (
          <p className="mt-4 text-[18px] leading-[1.45] text-pretty text-muted-strong md:text-[21px]">
            {post.subtitle}
          </p>
        )}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-ink/[0.08] py-3">
          <p className="font-mono text-[11px] font-light text-muted lg:text-xs">
            <span className="text-ink">{post.author}</span>
            {" · "}
            <time dateTime={post.date}>{longDate(post.date, lang)}</time>
            {" · "}
            {t.minRead(readingMinutes(post.blocks))}
          </p>
          {share}
        </div>
      </header>

      {post.cover && (
        <div className={`col-span-full mt-8 aspect-[16/9] md:aspect-[12/5] ${frame}`}>
          <Image
            src={post.cover.url}
            alt={post.cover.alt}
            fill
            preload
            sizes={`(min-width: ${WIDE_PX + 32}px) ${WIDE_PX}px, calc(100vw - 2rem)`}
            className="object-cover"
          />
        </div>
      )}

      {post.blocks.map((block, i) =>
        block.type === "text" ? (
          <div
            key={block.id}
            className={`col-start-2 text-[17px] leading-[1.7] break-words text-ink md:text-[18px] ${i ? "mt-6" : "mt-10"}`}
          >
            <Markdown components={MARKDOWN} disallowedElements={["img"]}>
              {block.text}
            </Markdown>
          </div>
        ) : (
          <Images key={block.id} block={block} />
        ),
      )}

      {footer && <footer className="col-start-2 mt-16 border-t border-ink/[0.08] pt-5">{footer}</footer>}
    </article>
  );
}
