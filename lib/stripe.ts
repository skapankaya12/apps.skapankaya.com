import Stripe from "stripe";

/**
 * Server-side Stripe client. Uses the secret key (never exposed to the browser).
 * A placeholder key is used when the env var is absent (e.g. at build time) so
 * the constructor doesn't throw — no network call happens until an API method
 * runs, and every route guards on `stripeConfigured` before touching Stripe.
 */
export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_placeholder_not_configured"
);

/** Platform commission (all-inclusive) applied as the Connect application fee. */
export const COMMISSION_RATE = 0.15;

/** Absolute origin for building Stripe return/success/cancel URLs. */
export function siteOrigin(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    req.headers.get("origin") ||
    `https://${req.headers.get("host") ?? "thesolomarket.com"}`
  );
}
