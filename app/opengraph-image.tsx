import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PROFILE } from "@/lib/profile";

// The preview shown when the site is shared (LinkedIn, WhatsApp, iMessage,
// X…). Rendered once at build time: the homepage card stack as a poster,
// in the light palette, with everything large enough to read as a thumbnail.

export const alt = `${PROFILE.name} — ${PROFILE.headline}, ${PROFILE.location}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Light palette, from globals.css.
const COLOR = {
  canvas: "#f2f2f2",
  surface: "#ffffff",
  ink: "#171717",
  muted: "#928c88",
  mutedStrong: "#5b5652",
  accent: "#a259ff",
};

const dataUrl = (bytes: Buffer, type: string) =>
  `data:${type};base64,${bytes.toString("base64")}`;

export default async function OpenGraphImage() {
  // Literal paths, so the build traces just these files.
  const [inter, interMedium, cascadia, photo, gators, pin] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Inter-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Inter-Medium.ttf")),
    readFile(join(process.cwd(), "assets/fonts/CascadiaCode-Light.ttf")),
    readFile(join(process.cwd(), "public/images/linkedin/profile.jpg")),
    readFile(join(process.cwd(), "public/images/uf-gators.png")),
    readFile(join(process.cwd(), "public/icons/location.svg")),
  ]);

  const card = { width: 1000, height: 400, radius: 36 };

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 48, // room for the cards peeking out below
          backgroundColor: COLOR.canvas,
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", position: "relative", ...card }}>
          {/* The cards behind, peeking out like on the homepage. */}
          <div
            style={{
              position: "absolute",
              left: card.width * 0.096,
              right: card.width * 0.096,
              top: 48,
              height: card.height,
              borderRadius: card.radius,
              backgroundColor: COLOR.accent,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: card.width * 0.05,
              right: card.width * 0.05,
              top: 26,
              height: card.height,
              borderRadius: card.radius,
              backgroundColor: COLOR.ink,
            }}
          />

          <div
            style={{
              display: "flex",
              position: "relative",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
              height: "100%",
              padding: "64px 80px 56px",
              borderRadius: card.radius,
              backgroundColor: COLOR.surface,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not the page */}
              <img
                src={dataUrl(photo, "image/jpeg")}
                alt=""
                width={168}
                height={168}
                style={{ borderRadius: 999, objectFit: "cover" }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: 68,
                    fontWeight: 500,
                    color: COLOR.ink,
                    letterSpacing: -1.5,
                    lineHeight: 1.05,
                  }}
                >
                  {PROFILE.name}
                </div>
                <div style={{ marginTop: 14, fontSize: 34, color: COLOR.mutedStrong }}>
                  {PROFILE.headline}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 8,
                    fontSize: 30,
                    color: COLOR.muted,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not the page */}
                  <img src={dataUrl(pin, "image/svg+xml")} alt="" width={20} height={25} />
                  {PROFILE.location}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontFamily: "Cascadia Code",
                fontWeight: 300,
                fontSize: 26,
                color: COLOR.muted,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not the page */}
              <img src={dataUrl(gators, "image/png")} alt="" width={44} height={44} />
              University of Florida · Computer Science
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
        { name: "Cascadia Code", data: cascadia, weight: 300, style: "normal" },
      ],
    },
  );
}
