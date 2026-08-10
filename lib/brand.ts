/**
 * Single source of truth for brand identity.
 * Change the name or domain here and it updates across the whole site.
 */
export const brand = {
  name: "The Solo Market",
  /**
   * Display domain — what a human reads on an OG card or in copy. Use this
   * when the domain is being shown, never when a URL is being built.
   */
  domain: "thesolomarket.com",
  /**
   * Canonical origin — what every machine-readable URL must name: canonical
   * tags, the sitemap, robots.txt, JSON-LD, OG urls.
   *
   * It has to be the www host. The apex 308-redirects to www (and must keep
   * doing so — the Stripe webhook lives on www and webhooks don't follow
   * redirects), so a canonical pointing at the apex would be telling Google
   * that the canonical version of a page lives at a URL that redirects.
   */
  url: "https://www.thesolomarket.com",
  tagline: "Encouraging anyone to build, everyone to own.",
  description:
    "The Solo Market is a marketplace for solo builders to sell their creative work, where anyone can buy it once, own it forever, and run it on your own computer. Because we encourage anyone to build and everyone to own.",
  // Commission the platform keeps per sale (all-inclusive; see BUSINESS_MODEL.md)
  commissionRate: 0.15,
  supportEmail: "noreply@thesolomarket.com",
  currency: "USD",
  currencySymbol: "$",
} as const;

/** Longer marketing copy, kept here so it's easy to iterate on the message. */
export const copy = {
  heroHeadline: "we encourage anyone to build,",
  heroHeadlineAccent: "everyone to own.",
  heroSub:
    "Connecting solo creative builders with buyers who value one-time purchases, self-hosted assets, and full data ownership.",
  missionTitle: "Why this exists",
  missionBody:
    "Every useful tool starts as someone's idea..a fix they built for their own problem. Most of those ideas never get sold; too niche to market, so they sit on a laptop. But the small thing someone already built might be exactly what solves your problem. Instead of paying $40 a month for a huge platform you use one feature of, find the one tool made for just that thing and own it for good.",
} as const;
