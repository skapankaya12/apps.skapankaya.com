import type { Listing } from "./types";

/**
 * The "new this week" popup: what counts as new, and how the popup remembers
 * a visitor. Pure, so the admin's approval (client) and the read that feeds
 * the popup (server) agree on the date.
 */

/** A rolling seven days rather than a calendar week, so Monday is never empty. */
export const WHATS_NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** At most this many rows in the popup; the rest are one link to /browse. */
export const WHATS_NEW_MAX_ROWS = 6;

/**
 * The day approvals started stamping `listedAt`. Anything created before it may
 * already have been approved once without a stamp, and there is no way to
 * tell, so those keep reading createdAt rather than becoming "new" the next
 * time an edit sends them back through review.
 */
const LISTED_AT_SINCE = Date.UTC(2026, 8, 13);

/** When a listing went on sale, as the popup reads it. */
export function listedAt(listing: Pick<Listing, "listedAt" | "createdAt">): number {
  return listing.listedAt ?? listing.createdAt;
}

/**
 * The `listedAt` to write when an admin approves, or undefined for "leave it".
 * Set once, on the first approval, and never moved by a later one.
 */
export function listedAtOnApproval(
  listing: Pick<Listing, "listedAt" | "createdAt">,
  now = Date.now()
): number | undefined {
  if (listing.listedAt) return undefined;
  if (listing.createdAt < LISTED_AT_SINCE) return undefined;
  return now;
}

/** One new listing, as the popup draws it. Public fields only. */
export interface WhatsNewItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  image?: string;
  listedAt: number;
  maker: {
    name: string;
    handle?: string;
    xHandle?: string;
    avatarUrl?: string;
  };
}

/**
 * "Don't show again" is for good; closing it is for this visit. A visit is
 * twelve hours rather than a browser tab, because a tab would bring it back
 * on every listing somebody opens in a new one. A visitor who comes back
 * tomorrow sees it again until they say otherwise.
 */
export const WHATS_NEW_NEVER_KEY = "am_whats_new_never";
export const WHATS_NEW_CLOSED_KEY = "am_whats_new_closed_at";
export const WHATS_NEW_SNOOZE_MS = 12 * 60 * 60 * 1000;
