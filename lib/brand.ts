/**
 * Single source of truth for brand identity.
 * Change the name or domain here and it updates across the whole site.
 */
export const brand = {
  name: "The Solo Market",
  domain: "thesolomarket.com",
  tagline: "Encouraging anyone to build, everyone to own.",
  description:
    "The Solo Market is a marketplace for solo builders to sell their creative work,  where anyone can buy it once, own it forever, and run it on your own computer. Because we encourage anyone to build and everyone to own.",
  // Commission the platform keeps per sale (all-inclusive; see BUSINESS_MODEL.md)
  commissionRate: 0.15,
  supportEmail: "noreply@thesolomarket.com",
  currency: "USD",
  currencySymbol: "$",
} as const;

/** Longer marketing copy, kept here so it's easy to iterate on the message. */
export const copy = {
  heroHeadline: "Someone had an idea. They built it.",
  heroHeadlineAccent: "Now it's yours.",
  heroSub:
    "Every tool here was built by someone who had an idea. Buy once, own it forever, run it on your own computer.",
  missionTitle: "Why this exists",
  missionBody:
    "Every useful tool starts as someone's idea..a fix they built for their own problem. Most of those ideas never get sold; too niche to market, so they sit on a laptop. But the small thing someone already built might be exactly what solves your problem. Instead of paying $40 a month for a huge platform you use one feature of, find the one tool made for just that thing and own it for good.",
} as const;
