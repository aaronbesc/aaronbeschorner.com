import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { Locale } from "@/lib/i18n";
import { PROFILE } from "@/lib/profile";
import { kicker, leadParagraphs, longDate, type Post } from "@/lib/writings";

// A post's two share images, drawn from its title, subtitle, byline and
// cover, in the site's light palette and type (Inter, and Cascadia Code
// for the small print):
//
// - the link preview (1200×630) that LinkedIn, WhatsApp, iMessage and X
//   show (app/og/writing/[slug]);
// - an Instagram story (1080×1920) with the start of the text, like the
//   ones newspapers share (app/og/writing/[slug]/story).

export const LINK_SIZE = { width: 1200, height: 630 };
export const STORY_SIZE = { width: 1080, height: 1920 };

/** Pages link the images with the post's version, so a day at the edge is safe. */
export const SHARE_CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";

// Light palette, from globals.css.
const COLOR = {
  canvas: "#f2f2f2",
  surface: "#ffffff",
  fg: "#000000",
  ink: "#171717",
  muted: "#928c88",
  mutedStrong: "#5b5652",
  line: "#e6e6e6",
};

const host = new URL(PROFILE.site).host;

async function fonts() {
  // Literal paths, so the build traces just these files.
  const [regular, medium, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Inter-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Inter-Medium.ttf")),
    readFile(join(process.cwd(), "assets/fonts/CascadiaCode-Light.ttf")),
  ]);
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Cascadia", data: mono, weight: 300 as const, style: "normal" as const },
  ];
}

/**
 * The cover, cropped to the size it's drawn at and re-encoded as JPEG:
 * any upload format works, and a phone photo doesn't slow the drawing.
 * Null if it can't be loaded; the image is then drawn without it.
 */
async function cover(post: Post, width: number, height: number) {
  if (!post.cover) return null;
  try {
    const res = await fetch(post.cover.url);
    if (!res.ok) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize(width, height, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

const mono = { fontFamily: "Cascadia", fontWeight: 300 } as const;

/** Text cut to a number of lines, with an ellipsis. */
const clamp = (lines: number) => ({ display: "block", lineClamp: lines }) as const;

export async function linkImage(post: Post, lang: Locale) {
  const width = 470;
  const photo = await cover(post, width * 2, (LINK_SIZE.height - 96) * 2);
  const byline = `${post.author} · ${longDate(post.date, lang, "short")}`;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", padding: 48, backgroundColor: COLOR.canvas, fontFamily: "Inter" }}>
        <div style={{ display: "flex", flex: 1, overflow: "hidden", borderRadius: 32, backgroundColor: COLOR.surface }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "52px 56px" }}>
            <div style={{ ...mono, fontSize: 24, color: COLOR.muted }}>{kicker(post, lang)}</div>
            <div
              style={{
                ...clamp(photo ? 4 : 3),
                marginTop: 22,
                fontSize: photo ? 52 : 64,
                fontWeight: 500,
                lineHeight: 1.08,
                letterSpacing: photo ? -1.4 : -1.8,
                color: COLOR.fg,
              }}
            >
              {post.title}
            </div>
            {post.subtitle && (
              <div style={{ ...clamp(2), marginTop: 18, fontSize: 28, lineHeight: 1.3, color: COLOR.mutedStrong }}>
                {post.subtitle}
              </div>
            )}
            <div style={{ display: "flex", flex: 1 }} />
            <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: 22, color: COLOR.muted }}>
              <span style={{ color: COLOR.ink }}>{byline}</span>
              {!photo && <span>{host}</span>}
            </div>
          </div>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not the page
            <img src={photo} alt="" width={width} height={LINK_SIZE.height - 96} style={{ objectFit: "cover" }} />
          )}
        </div>
      </div>
    ),
    { ...LINK_SIZE, fonts: await fonts() },
  );
}

export async function storyImage(post: Post, lang: Locale) {
  // Instagram lays its own controls over the top and bottom of a story;
  // everything sits between them.
  const cardWidth = STORY_SIZE.width - 2 * 72;
  const photoHeight = 400;
  const photo = await cover(post, cardWidth * 2, photoHeight * 2);
  // More than fits: the card cuts it off and it fades out, as if it goes on.
  const lead = leadParagraphs(post.blocks, 900);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "210px 72px 290px",
          backgroundColor: COLOR.canvas,
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: 28, color: COLOR.muted, marginBottom: 32, padding: "0 8px" }}>
          <span style={{ color: COLOR.ink }}>{host}</span>
          <span>{longDate(post.date, lang, "short")}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", borderRadius: 48, backgroundColor: COLOR.surface }}>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not the page
            <img src={photo} alt="" width={cardWidth} height={photoHeight} style={{ objectFit: "cover" }} />
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", padding: "56px 64px 60px" }}>
            <div style={{ ...mono, fontSize: 30, color: COLOR.muted }}>{kicker(post, lang)}</div>
            <div
              style={{
                ...clamp(photo ? 3 : 5),
                marginTop: 24,
                fontSize: 74,
                fontWeight: 500,
                lineHeight: 1.08,
                letterSpacing: -2.2,
                color: COLOR.fg,
              }}
            >
              {post.title}
            </div>
            {post.subtitle && (
              <div style={{ ...clamp(photo ? 2 : 3), marginTop: 24, fontSize: 38, lineHeight: 1.32, color: COLOR.mutedStrong }}>
                {post.subtitle}
              </div>
            )}

            {lead.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", marginTop: 40, paddingTop: 40, borderTop: `2px solid ${COLOR.line}`, position: "relative" }}>
                {lead.map((paragraph, i) => (
                  <div key={i} style={{ display: "block", flexShrink: 0, marginTop: i ? 26 : 0, fontSize: 34, lineHeight: 1.55, color: COLOR.ink }}>
                    {paragraph}
                  </div>
                ))}
                {/* Fades the text out where the card cuts it off. */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 110,
                    backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0), ${COLOR.surface})`,
                  }}
                />
              </div>
            )}
            {lead.length === 0 && <div style={{ display: "flex", flex: 1 }} />}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 36, ...mono, fontSize: 28 }}>
              <span style={{ color: COLOR.ink }}>{post.author}</span>
              <span style={{ color: COLOR.muted }}>{host}/writing</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...STORY_SIZE, fonts: await fonts() },
  );
}
