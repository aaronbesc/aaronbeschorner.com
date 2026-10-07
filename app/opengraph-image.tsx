import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PROFILE } from "@/lib/profile";

// The preview shown when the site is shared (LinkedIn, WhatsApp, iMessage,
// X…). Rendered once at build time: the homepage's white card as a poster,
// in the light palette, large enough to read as a thumbnail.

const TAGLINE = "data + ai + design";

export const alt = `${PROFILE.name} — ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Light palette, from globals.css.
const COLOR = {
  canvas: "#f2f2f2",
  surface: "#ffffff",
  ink: "#171717",
  mutedStrong: "#5b5652",
};

export default async function OpenGraphImage() {
  // Literal paths, so the build traces just these files.
  const [inter, interMedium, photo] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Inter-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Inter-Medium.ttf")),
    readFile(join(process.cwd(), "public/images/linkedin/profile.jpg")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 80,
          backgroundColor: COLOR.canvas,
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 60,
            borderRadius: 40,
            backgroundColor: COLOR.surface,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not the page */}
          <img
            src={`data:image/jpeg;base64,${photo.toString("base64")}`}
            alt=""
            width={220}
            height={220}
            style={{ borderRadius: 999, objectFit: "cover" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 80,
                fontWeight: 500,
                color: COLOR.ink,
                letterSpacing: -2,
                lineHeight: 1.05,
              }}
            >
              {PROFILE.name}
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 40,
                color: COLOR.mutedStrong,
                letterSpacing: -0.4,
              }}
            >
              {TAGLINE}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: inter, weight: 400, style: "normal" },
        { name: "Inter", data: interMedium, weight: 500, style: "normal" },
      ],
    },
  );
}
