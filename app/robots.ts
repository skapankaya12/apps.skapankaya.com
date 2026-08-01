import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

/**
 * Only account-gated and transactional paths are disallowed. Everything a
 * buyer or seller could arrive at from a search — listings, browse, blog,
 * about, how-to-run, sell — stays open.
 *
 * DELIBERATE: there is no rule for GPTBot, ClaudeBot, PerplexityBot,
 * Google-Extended or any other AI crawler, which means they are all allowed.
 * That's the point — being quoted in an AI answer is how a new marketplace
 * gets found now, and per Google's own AI-features guidance the ordinary
 * Googlebot rules are what govern AI Overviews too. Don't add a blanket
 * `disallow: "/"` for a specific AI user-agent without meaning to opt out of
 * that entirely.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/checkout",
        "/library",
        "/account",
        "/saved",
        "/cart",
        "/login",
        "/api/",
      ],
    },
    sitemap: `${brand.url}/sitemap.xml`,
    host: brand.url,
  };
}
