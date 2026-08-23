import { ImageResponse } from "next/og";
import { brand, copy } from "@/lib/brand";

/**
 * The default social card for the whole site. Without this, every link shared
 * to X, LinkedIn, Slack or iMessage renders as a bare grey box — and link
 * previews are increasingly what an AI assistant shows when it cites a source.
 *
 * ImageResponse only supports flexbox and a subset of CSS (no grid), so this
 * is deliberately plain.
 */
export const alt = `${brand.name}: ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          // Flat approximation of the hero's WebGL wash — Satori has no canvas,
          // but the card and the page should read as the same surface.
          backgroundImage:
            "linear-gradient(120deg, #e4e9ff 0%, #f4f5ff 34%, #ffffff 58%, #f3efff 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#eef0ff",
              color: "#4f46e5",
              borderRadius: 999,
              padding: "10px 24px",
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            Buy once · own it forever · no subscription
          </div>
          {/*
            A column, not a wrapping row: the headline gets one line and the
            accent clause the next, matching the hero. As a wrapping row the
            first clause broke mid-phrase ("...by one / person,").
            62px is sized so that clause fits the 1056px of content width at
            Satori's fallback face, which is wider than Manrope.
          */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 40,
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: -2,
            }}
          >
            <div style={{ display: "flex", color: "#101014" }}>
              {copy.heroHeadline}
            </div>
            <div style={{ display: "flex", color: "#4f46e5" }}>
              {copy.heroHeadlineAccent}
            </div>
          </div>
          {/*
            The same sub-line as the hero, read from `copy` rather than written
            out again here. It was a second hardcoded copy of the pitch, so
            rewriting the hero left the social card advertising the old one.
            Deliberately just the pitch — no pre-launch notice.
          */}
          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 30,
              color: "#5b5b66",
              lineHeight: 1.4,
              maxWidth: 1000,
            }}
          >
            {copy.heroSub}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderTop: "2px solid #e6e6ea",
            paddingTop: 28,
            fontSize: 30,
            color: "#101014",
            fontWeight: 700,
          }}
        >
          {brand.domain}
        </div>
      </div>
    ),
    size
  );
}
