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
          {/* Two rows, matching the hero: the headline, then the byline with
              its accent word in the logo gradient. 56px is sized so row one
              fits the 1056px of content width at Satori's fallback face,
              which is wider than Manrope; at 62px it wrapped. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: -2,
              color: "#101014",
            }}
          >
            <div style={{ display: "flex" }}>{copy.heroHeadline}</div>
            <div style={{ display: "flex" }}>
              <span>{copy.heroByline.before}&nbsp;</span>
              <span
                style={{
                  backgroundImage: "linear-gradient(90deg, #2f8bff, #6a4bf0)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {copy.heroByline.accent}
              </span>
              <span>&nbsp;{copy.heroByline.after}</span>
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
              flexWrap: "wrap",
              marginTop: 26,
              fontSize: 34,
              color: "#5b5b66",
              lineHeight: 1.4,
              maxWidth: 1000,
            }}
          >
            <span>{copy.heroSub}&nbsp;</span>
            <span
              style={{
                fontWeight: 700,
                backgroundImage: "linear-gradient(90deg, #2f8bff, #6a4bf0)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {copy.heroSubAccent}
            </span>
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
