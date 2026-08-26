import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { articles } from "@/lib/articles";
import { DOCS, docPath } from "@/components/Docs";
import { getApprovedListings, hasPublishableSlug } from "@/lib/listings.server";
import { getSellerRoutesFor } from "@/lib/profiles.server";

/** Revalidated with the catalogue, so new listings show up within minutes. */
export const revalidate = 300;

/**
 * Static pages change when we edit them, not on every crawl. Stamping
 * `new Date()` here would tell Google the whole site changed every time it
 * fetched the sitemap, which is exactly how a site teaches Google to ignore
 * its lastmod values. Bump this by hand when the marketing pages change.
 */
const STATIC_LAST_MODIFIED = new Date("2026-08-26");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = brand.url;

  // Legal pages are low priority for search but should still be indexable:
  // "is this marketplace legit" is a question a cautious seller asks, and the
  // terms answering it is a trust signal worth having in the index.
  const legalRoutes = ["/terms", "/privacy", "/refunds"];
  const staticRoutes = [
    "",
    "/browse",
    "/sell",
    "/about",
    "/blog",
    "/how-to-run",
    ...legalRoutes,
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : legalRoutes.includes(path) ? 0.3 : 0.7,
  }));

  // Documentation: the /docs hub plus one page per doc. These are the pages an
  // AI assistant is most likely to quote when explaining the marketplace, so
  // every one is in the index.
  const docRoutes = ["/docs", ...DOCS.map((d) => docPath(d.slug))].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })
  );

  // One entry per article: the blog's whole reason for existing is discovery.
  const articleRoutes = articles.map((a) => ({
    url: `${base}/blog/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Listings are the long-tail traffic engine — one page per problem someone
  // might search for — so every approved one gets its own entry.
  const listings = await getApprovedListings();
  const listingRoutes = listings
    .filter((l) => hasPublishableSlug(l.slug))
    .map((l) => ({
      url: `${base}/app/${l.slug}`,
      lastModified: new Date(l.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // One page per seller who has something on sale. "Who made this" is a real
  // search, and it is the page a maker links to from their own site, so it is
  // worth crawling even though it mostly repeats what the listings say.
  const sellerRoutes = (await getSellerRoutesFor(listings)).map((s) => ({
    url: `${base}/seller/${s.handle}`,
    lastModified: s.lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [
    ...staticRoutes,
    ...docRoutes,
    ...listingRoutes,
    ...sellerRoutes,
    ...articleRoutes,
  ];
}
