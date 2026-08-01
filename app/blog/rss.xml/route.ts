import { brand } from "@/lib/brand";
import { articlesSorted, type Block } from "@/lib/articles";

/**
 * RSS 2.0 feed for the Insights blog.
 *
 * Feeds are read far more than their reputation suggests: aggregators,
 * newsletter tools and AI crawlers all consume them, and unlike a page they
 * hand over clean, unambiguous text with dates and authorship attached. Cheap
 * to serve when the articles are already a typed array.
 */
export const revalidate = 3600;

/** XML text nodes can't carry raw &, <, >, quotes. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Flatten an article's blocks into plain prose for the feed body. */
function blocksToText(body: Block[]): string {
  return body
    .map((b) => {
      switch (b.type) {
        case "ul":
          return b.items.map((i) => `• ${i}`).join("\n");
        case "quote":
          return `“${b.text}”`;
        default:
          return b.text;
      }
    })
    .join("\n\n");
}

export function GET() {
  const site = `https://${brand.domain}`;
  const posts = articlesSorted();
  const updated = posts[0] ? new Date(posts[0].date) : new Date();

  const items = posts
    .map(
      (a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${site}/blog/${a.slug}</link>
      <guid isPermaLink="true">${site}/blog/${a.slug}</guid>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      <category>${esc(a.tag)}</category>
      <description>${esc(a.excerpt)}</description>
      <content:encoded><![CDATA[${blocksToText(a.body)}]]></content:encoded>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(brand.name)} — Insights</title>
    <link>${site}/blog</link>
    <atom:link href="${site}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Articles for indie makers and independent professionals: building and selling small software, buying tools instead of renting bloated SaaS, and local-first work.</description>
    <language>en</language>
    <lastBuildDate>${updated.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
