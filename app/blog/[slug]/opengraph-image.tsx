import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { articles, getArticle, formatDate } from "@/lib/articles";

/** Per-article social card, so an Insights link shares as more than a URL. */
export const alt = `Insights · ${brand.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);

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
            {article?.tag ?? "Insights"}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 36,
              fontSize: 70,
              fontWeight: 800,
              color: "#101014",
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            {article?.title ?? "Insights"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #e6e6ea",
            paddingTop: 28,
            fontSize: 28,
            color: "#5b5b66",
          }}
        >
          <div style={{ display: "flex" }}>
            {article ? formatDate(article.date) : brand.tagline}
          </div>
          <div style={{ display: "flex", fontWeight: 700, color: "#4f46e5" }}>
            {brand.domain}
          </div>
        </div>
      </div>
    ),
    size
  );
}
