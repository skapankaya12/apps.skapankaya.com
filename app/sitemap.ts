import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
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

  // TODO: add one entry per approved listing here, read from Firestore via the
  // Admin SDK at build/request time. Listings are the long-tail traffic engine,
  // so this matters for SEO once the catalogue is live.

  return [...staticRoutes, ...articleRoutes];
}
