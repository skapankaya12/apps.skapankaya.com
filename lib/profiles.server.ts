import { cache } from "react";
import { getAdminDb, adminConfigured } from "./firebaseAdmin";
import type { AppUser, Listing, SellerFace, SellerProfile } from "./types";

/**
 * Server-side reads of seller profiles.
 *
 * This file exists because the Firestore rules keep /users readable by its
 * owner and admins only, and that is worth keeping: the user document holds an
 * account email, a role and Stripe payout state. So the public half of a seller
 * is assembled here with the Admin SDK and handed to client components as a
 * prop. Nothing on the client fetches a profile.
 *
 * Wrapped in React's cache() so generateMetadata and the page body share one
 * round-trip, matching lib/listings.server.ts.
 */

function toProfile(uid: string, data: Partial<AppUser>): SellerProfile {
  return {
    uid,
    handle: data.handle,
    displayName: data.displayName ?? "",
    bio: data.bio,
    supportEmail: data.supportEmail,
    website: data.website,
    xHandle: data.xHandle,
    avatarUrl: data.avatarUrl,
    memberSince: data.createdAt ?? 0,
  };
}

/** One seller's public profile by uid, or null if there is no such user. */
export const getSellerProfile = cache(
  async (uid: string): Promise<SellerProfile | null> => {
    if (!adminConfigured) return null;
    try {
      const snap = await getAdminDb().collection("users").doc(uid).get();
      if (!snap.exists) return null;
      return toProfile(snap.id, snap.data() as Partial<AppUser>);
    } catch (err) {
      console.error("[profiles.server] getSellerProfile:", err);
      return null;
    }
  }
);

/**
 * Resolve a handle to its owner.
 *
 * `active: false` means the handle was renamed away from but is still held by
 * the same seller, so the route redirects to their current one rather than
 * 404ing a link somebody bookmarked. Handles are never deleted, so this only
 * returns null for a handle that was never claimed.
 */
export const resolveHandle = cache(
  async (
    handle: string
  ): Promise<{ uid: string; active: boolean } | null> => {
    if (!adminConfigured) return null;
    try {
      const snap = await getAdminDb()
        .collection("handles")
        .doc(handle.toLowerCase())
        .get();
      if (!snap.exists) return null;
      const data = snap.data() as { uid: string; active?: boolean };
      return { uid: data.uid, active: data.active !== false };
    } catch (err) {
      console.error("[profiles.server] resolveHandle:", err);
      return null;
    }
  }
);

/**
 * The seller to show on a listing page, profile first and listing second.
 *
 * Every listing written before profiles existed carries its own copy of the
 * bio, contact and link. Those are read here when the profile has nothing, so
 * the About-the-seller block never goes blank on an old listing. Falling back
 * per field rather than per seller matters: a seller who has filled in a bio
 * but not a website should still show the website their old listing carried.
 */
export async function resolveSellerProfile(
  listing: Listing
): Promise<SellerProfile> {
  const profile = await getSellerProfile(listing.sellerId);
  return {
    uid: listing.sellerId,
    handle: profile?.handle,
    displayName: profile?.displayName || listing.sellerName,
    bio: profile?.bio || listing.sellerBio,
    supportEmail: profile?.supportEmail || listing.sellerEmail,
    website: profile?.website || listing.sellerWebsite,
    avatarUrl: profile?.avatarUrl,
    memberSince: profile?.memberSince ?? listing.createdAt,
  };
}

/** Every approved listing by one seller, newest first. */
export const getListingsBySeller = cache(
  async (uid: string): Promise<Listing[]> => {
    if (!adminConfigured) return [];
    try {
      const snap = await getAdminDb()
        .collection("listings")
        .where("sellerId", "==", uid)
        .where("status", "==", "approved")
        .get();
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Listing, "id">) }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      console.error("[profiles.server] getListingsBySeller:", err);
      return [];
    }
  }
);

/**
 * Seller pages worth putting in the sitemap, with a real last-modified date.
 *
 * Derived from who actually has something on sale rather than from the handles
 * collection, so a claimed handle with an empty profile behind it never gets
 * submitted to Google as a page worth crawling. Takes the approved listings the
 * caller has already loaded, because the sitemap has them in hand.
 *
 * `lastModified` is the most recent update among that seller's own listings.
 * The profile document has no timestamp we expose, and this is the better
 * signal anyway: a seller page is mostly their tools, so it genuinely changes
 * when one of them does. These pages used to carry the static build date, which
 * said every seller page changed on the day the marketing copy did.
 */
export async function getSellerRoutesFor(
  listings: Listing[]
): Promise<{ handle: string; lastModified: Date }[]> {
  const latestByUid = new Map<string, number>();
  for (const l of listings) {
    const prev = latestByUid.get(l.sellerId) ?? 0;
    if (l.updatedAt > prev) latestByUid.set(l.sellerId, l.updatedAt);
  }

  const uids = [...latestByUid.keys()];
  const profiles = await Promise.all(uids.map((uid) => getSellerProfile(uid)));

  return profiles.flatMap((p, i) => {
    if (!p?.handle) return [];
    const ts = latestByUid.get(uids[i]) ?? 0;
    return [
      {
        handle: p.handle,
        lastModified: new Date(Number.isFinite(ts) && ts > 0 ? ts : Date.now()),
      },
    ];
  });
}

/**
 * The sellers to draw in the sphere on /sell.
 *
 * Derived from approved listings for the same reason getSellerRoutesFor is:
 * signing up does not make somebody a seller, shipping something does. An
 * account that upgraded its role and then never listed anything would otherwise
 * appear on the recruiting page as evidence of a marketplace it never joined.
 *
 * Ordered so the most complete profiles come first. The sphere gives its early
 * indices a larger base scale, so a real photo stays bigger than a placeholder
 * no matter which way the sphere has rotated. Within a tier the order is
 * whatever the listing query gave us, which is stable enough that the layout
 * does not reshuffle between renders.
 */
export async function getPublicSellersFor(
  listings: Listing[]
): Promise<SellerFace[]> {
  const uids = [...new Set(listings.map((l) => l.sellerId))];
  const profiles = await Promise.all(uids.map((uid) => getSellerProfile(uid)));

  const faces = profiles
    .filter((p): p is SellerProfile => Boolean(p?.displayName?.trim()))
    .map((p) => ({
      handle: p.handle,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl || undefined,
    }));

  // Photo, then at least a linkable handle, then the bare name. `rank` rather
  // than a chain of comparisons so adding a tier later stays one line.
  const rank = (f: SellerFace) => (f.avatarUrl ? 0 : f.handle ? 1 : 2);
  return faces.sort((a, b) => rank(a) - rank(b));
}
