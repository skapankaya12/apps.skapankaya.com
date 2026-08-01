import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import {
  getApprovedListingBySlug,
  formatPriceServer,
} from "@/lib/listings.server";
import { CATEGORY_LABELS } from "@/lib/types";

/**
 * Per-listing social card: what someone sees when a tool's link is pasted into
 * a chat, a post, or an AI assistant's citation. Shows the one thing that
 * matters — what it does and what it costs, once.
 */
export const alt = "Tool on The Solo Market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getApprovedListingBySlug(slug);

  // The route still has to return an image if the listing vanished between the
  // page render and this request; fall back to the brand card.
  const title = listing?.title ?? brand.name;
  const tagline = listing?.tagline ?? brand.tagline;

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
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {listing && (
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
              {CATEGORY_LABELS[listing.category]}
            </div>
          )}
          <div
            style={{
              display: "flex",
              marginTop: 36,
              fontSize: 80,
              fontWeight: 800,
              color: "#101014",
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 34,
              color: "#5b5b66",
              lineHeight: 1.35,
              maxWidth: 980,
            }}
          >
            {tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: "2px solid #e6e6ea",
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {listing && (
              <div
                style={{
                  display: "flex",
                  fontSize: 52,
                  fontWeight: 800,
                  color: "#101014",
                }}
              >
                {formatPriceServer(listing.priceCents)}
              </div>
            )}
            <div
              style={{
                display: "flex",
                fontSize: 26,
                color: "#5b5b66",
                marginTop: 6,
              }}
            >
              {listing
                ? `One-time · yours forever · by ${listing.sellerName}`
                : brand.tagline}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              color: "#4f46e5",
            }}
          >
            {brand.domain}
          </div>
        </div>
      </div>
    ),
    size
  );
}
