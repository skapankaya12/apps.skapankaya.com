import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { seedListings } from "@/lib/seed";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${brand.domain}`;
  const staticRoutes = ["", "/browse", "/sell", "/about", "/how-to-run"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
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

  return [...staticRoutes, ...listingRoutes];
}
