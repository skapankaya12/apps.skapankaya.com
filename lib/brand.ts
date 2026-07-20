/**
 * Single source of truth for brand identity.
 * Change the name or domain here and it updates across the whole site.
 */
export const brand = {
  name: "AppBazaar",
  domain: "appbazaar.dev",
  tagline: "Small tools, born from real problems.",
  description:
    "A marketplace for small software that solves one specific problem, built by the people who needed it. Buy it once, own it forever, and run it on your own computer. Skip the bloated platform you use one feature of, and find the one tool that fixes your thing.",
  // Commission the platform keeps per sale (all-inclusive; see BUSINESS_MODEL.md)
  commissionRate: 0.15,
  supportEmail: "hello@appbazaar.dev",
  currency: "USD",
  currencySymbol: "$",
} as const;

/** Longer marketing copy, kept here so it's easy to iterate on the message. */
export const copy = {
  heroHeadline: "Someone had a problem. They built the fix.",
  heroHeadlineAccent: "Now it's yours.",
  heroSub:
    "Every tool here was built by someone who had the problem. Buy once, own it forever, run it on your own computer.",
  missionTitle: "Why this exists",
  missionBody:
    "Most small software never gets sold. It's too niche to market, so it sits on someone's laptop. But that niche tool might be exactly what solves your problem. Instead of paying $40 a month for a huge platform you use one feature of, find the one tool that does just that thing. Surf around and find your solution.",
} as const;
