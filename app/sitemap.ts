import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { seedListings } from "@/lib/seed";
import { articles } from "@/lib/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${brand.domain}`;
  const staticRoutes = ["", "/browse", "/sell", "/about", "/blog", "/how-to-run"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })
  );

  // One entry per article: the blog's whole reason for existing is discovery.
  const articleRoutes = articles.map((a) => ({
    url: `${base}/blog/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // One SEO entry per approved listing. This is the long-tail traffic engine.
  const listingRoutes = seedListings
    .filter((l) => l.status === "approved")
    .map((l) => ({
      url: `${base}/app/${l.slug}`,
      lastModified: new Date(l.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  return [...staticRoutes, ...listingRoutes, ...articleRoutes];
}
