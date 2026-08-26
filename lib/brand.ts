/**
 * The pitch, written once.
 *
 * This one sentence is the hero sub-line, the sub-line on the social card, the
 * meta description, og/twitter:description, the PWA manifest and the
 * description on both JSON-LD entities. It used to be three separate strings
 * that were edited independently, so a rewrite of the hero quietly left shared
 * links and search snippets advertising an older pitch. Change it here and
 * every one of those moves together.
 */
const PITCH =
  "A marketplace for small software tools made by solo builders. Pay once, run it yourself, keep it for good. No subscriptions.";

/**
 * Where the marketplace is in its life, in one sentence.
 *
 * This is the fact that qualifies every other claim the site makes, and it used
 * to live only in the home page hero, as prose. Nothing machine-readable said
 * it, so the structured data described a marketplace that was open for
 * business. Shared by the JSON-LD Organization and WebSite nodes and by the
 * /browse heading, so those three cannot drift apart.
 *
 * On launch day this constant and every reference to it come out together. See
 * LAUNCH_CHECKLIST.md for the full list of pre-launch copy to remove.
 */
const STATUS_NOTE =
  "Pre-launch: the marketplace is collecting listings from solo builders, and tools cannot be bought until the public launch.";

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
  /** Meta description, og/twitter:description, manifest and JSON-LD. See PITCH. */
  description: PITCH,
  /** Launch status. See STATUS_NOTE. Remove at launch. */
  statusNote: STATUS_NOTE,
  // Commission the platform keeps per sale (all-inclusive; see BUSINESS_MODEL.md)
  commissionRate: 0.15,
  supportEmail: "noreply@thesolomarket.com",
  currency: "USD",
  currencySymbol: "$",
} as const;

/** Longer marketing copy, kept here so it's easy to iterate on the message. */
export const copy = {
  heroHeadline: "small software tools by one person,",
  heroHeadlineAccent: "owned by you.",
  /** Same sentence as brand.description — see PITCH. */
  heroSub: PITCH,
  missionTitle: "Why this exists",
  missionBody:
    "Every useful tool starts as someone's idea..a fix they built for their own problem. Most of those ideas never get sold; too niche to market, so they sit on a laptop. But the small thing someone already built might be exactly what solves your problem. Instead of paying $40 a month for a huge platform you use one feature of, find the one tool made for just that thing and own it for good.",
} as const;
