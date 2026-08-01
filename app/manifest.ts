import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

/**
 * Web app manifest. Mostly this is a mobile/installability signal — it's also
 * one of the things Lighthouse's SEO and PWA checks look for, and it gives
 * Android and Chrome a proper name and colour instead of guessing from <title>.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name}: ${brand.tagline}`,
    short_name: brand.name,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    categories: ["shopping", "productivity", "business"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/logo.png", sizes: "1160x620", type: "image/png" },
    ],
  };
}
