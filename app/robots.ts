import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

/**
 * Everything a buyer or seller could arrive at from a search — listings,
 * browse, blog, about, how-to-run, sell — stays open.
 *
 * Only /admin and /api/ are disallowed, and only because we don't want them
 * fetched at all. The account-gated pages (/login, /cart, /saved, /account,
 * /library, /dashboard, /checkout) are deliberately NOT listed here: they are
 * linked from the navbar on every public page, so Googlebot sees them
 * constantly, and a robots.txt block would mean it can never fetch them to
 * read their `noindex`. A blocked-but-heavily-linked URL is exactly what gets
 * indexed URL-only, on anchor text alone. So we let Googlebot crawl them and
 * serve `robots: { index: false }` from each segment's layout instead — it
 * fetches once, sees the directive, and drops them cleanly. Keeping them out
 * of here is the point; don't "tidy up" by adding them back.
 *
 * Crawl budget isn't a concern at this size (~24 known URLs).
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
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${brand.url}/sitemap.xml`,
    host: brand.url,
  };
}
