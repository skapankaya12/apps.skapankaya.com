import { cache } from "react";
import { getAdminDb, adminConfigured } from "./firebaseAdmin";
import type { Listing } from "./types";

/**
 * Server-side reads of the public catalogue, via the Admin SDK.
 *
 * The client store (lib/store.ts) keeps listings live with onSnapshot, which is
 * great for the app but invisible to crawlers: Googlebot only sees it on a
 * second, JS-rendering pass, and AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
 * don't run JS at all. So pages fetch here first and render real HTML, then the
 * client store takes over once it hydrates.
 *
 * Each function is wrapped in React's cache() so generateMetadata and the page
 * body share a single Firestore round-trip per request.
 *
 * Every read is scoped to status === "approved" — the same slice the Firestore
 * rules make world-readable. Nothing pending, rejected or draft leaks out.
 */

function toListing(d: FirebaseFirestore.QueryDocumentSnapshot): Listing {
  return { id: d.id, ...(d.data() as Omit<Listing, "id">) };
}

/** Every approved listing, newest first. Empty when the Admin SDK isn't configured. */
export const getApprovedListings = cache(async (): Promise<Listing[]> => {
  // `next build` runs without the service-account env vars, and previews may
  // too. Degrade to an empty catalogue rather than failing the render.
  if (!adminConfigured) return [];
  try {
    const snap = await getAdminDb()
      .collection("listings")
      .where("status", "==", "approved")
      .get();
    return snap.docs.map(toListing).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error("[listings.server] getApprovedListings:", err);
    return [];
  }
});

/** One approved listing by slug, or null if it doesn't exist / isn't approved. */
export const getApprovedListingBySlug = cache(
  async (slug: string): Promise<Listing | null> => {
    if (!adminConfigured) return null;
    try {
      const snap = await getAdminDb()
        .collection("listings")
        .where("slug", "==", slug)
        .where("status", "==", "approved")
        .limit(1)
        .get();
      return snap.empty ? null : toListing(snap.docs[0]);
    } catch (err) {
      console.error("[listings.server] getApprovedListingBySlug:", err);
      return null;
    }
  }
);

/**
 * Whether a slug is short enough to publish as a URL.
 *
 * slugify() in lib/store.ts caps new slugs at 60 characters, but listings
 * created before that cap can be far longer — one is ~450 characters, long
 * enough to exceed the filesystem path limit during a build. Those pages still
 * render on demand; they just don't get prerendered or put in the sitemap,
 * because a URL that long is bad for search anyway.
 */
export function hasPublishableSlug(slug: string | undefined): boolean {
  return Boolean(slug) && slug!.length <= 100;
}

/**
 * Price for display, server-side. Mirrors formatPrice() in lib/store.ts, which
 * lives behind a "use client" boundary we don't want to drag onto the server.
 */
export function formatPriceServer(cents: number, symbol = "$"): string {
  return `${symbol}${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}
