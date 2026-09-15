import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { TAGLINE, VERSION } from "./site";

/** Shared by opengraph-image and twitter-image: the page's own frame, blueprint and wordmark. */
export const ogSize = { width: 1200, height: 630 };
export const ogAlt = "Helicon: Muse Code, without living in the terminal. A free, open-source desktop and web app for the muse CLI.";

export async function renderOgImage() {
  const [heading, headingBold, body, logo] = await Promise.all([
    // Literal paths keep the build's file tracing to exactly these four files.
    readFile(join(process.cwd(), "node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-500-normal.woff")),
    readFile(join(process.cwd(), "node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff")),
    readFile(join(process.cwd(), "node_modules/@fontsource/manrope/files/manrope-latin-500-normal.woff")),
    readFile(join(process.cwd(), "public/assets/logo-dark.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  const bg = "#0f1012";
  const fg = "#eff1f3";
  const line = "rgba(239,241,243,0.08)";
  const frameLeft = 64;
  const frameRight = 1200 - 64;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: bg, fontFamily: "Manrope" }}>
        {/* Blueprint ground, as on the site: grid every 40px, unit dots between. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            backgroundPosition: "24px 0",
          }}
        />
        {/* The page frame. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: frameLeft,
            width: frameRight - frameLeft,
            display: "flex",
            flexDirection: "column",
            background: bg,
            borderLeft: "1px solid rgba(239,241,243,0.12)",
            borderRight: "1px solid rgba(239,241,243,0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "40px 56px 0" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={44} height={44} style={{ borderRadius: 11 }} alt="" />
            <div style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 30, color: fg }}>Helicon</div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(122,183,251,0.14)",
                color: "#9cc8fa",
                fontSize: 20,
              }}
            >
              v{VERSION} · Free and MIT licensed
            </div>
          </div>

          <div style={{ display: "flex", height: 1, background: "rgba(239,241,243,0.12)", marginTop: 36 }} />

          <div style={{ display: "flex", flexDirection: "column", padding: "44px 56px 0" }}>
            <div
              style={{
                fontFamily: "Instrument Sans",
                fontWeight: 600,
                fontSize: 74,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                color: fg,
                maxWidth: 940,
              }}
            >
              Muse Code, without living in the terminal.
            </div>
            <div style={{ marginTop: 22, fontSize: 28, color: "rgba(239,241,243,0.72)" }}>{TAGLINE}</div>
          </div>

          {/* The footer wordmark: faded in from the top, cut by the image edge. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: -150,
              display: "flex",
              justifyContent: "center",
              fontFamily: "Instrument Sans",
              fontWeight: 600,
              fontSize: 300,
              letterSpacing: "-0.04em",
              backgroundImage: "linear-gradient(to bottom, rgba(239,241,243,0) 20%, rgba(239,241,243,0.14) 62%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            helicon
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Instrument Sans", data: heading, weight: 500, style: "normal" },
        { name: "Instrument Sans", data: headingBold, weight: 600, style: "normal" },
        { name: "Manrope", data: body, weight: 500, style: "normal" },
      ],
    },
  );
}
