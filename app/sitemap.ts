import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { articles } from "@/lib/articles";
import { getApprovedListings, hasPublishableSlug } from "@/lib/listings.server";

/** Revalidated with the catalogue, so new listings show up within minutes. */
export const revalidate = 300;

/**
 * Static pages change when we edit them, not on every crawl. Stamping
 * `new Date()` here would tell Google the whole site changed every time it
 * fetched the sitemap, which is exactly how a site teaches Google to ignore
 * its lastmod values. Bump this by hand when the marketing pages change.
 */
const STATIC_LAST_MODIFIED = new Date("2026-08-01");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${brand.domain}`;

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

  return [...staticRoutes, ...listingRoutes, ...articleRoutes];
}
