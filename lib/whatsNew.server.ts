import { getApprovedListings, hasPublishableSlug } from "./listings.server";
import { getSellerProfile } from "./profiles.server";
import { listingPoster } from "./utils";
import {
  WHATS_NEW_WINDOW_MS,
  WHATS_NEW_MAX_ROWS,
  listedAt,
  type WhatsNewItem,
} from "./whatsNew";

/**
 * The listings behind the "new this week" popup, newest first.
 *
 * Returns everything listed in the last seven days, and never fewer than the
 * most recent WHATS_NEW_MAX_ROWS whatever their age. The popup recounts the
 * week itself, so the extra rows are ignored on a normal visit; they are there
 * so ?whatsnew=3 can show the design with real listings on a quiet week.
 *
 * The seller's face and handles come from their profile, which only the Admin
 * SDK can read (see lib/profiles.server.ts), so this has to run here.
 */
export async function getWhatsNew(now = Date.now()): Promise<WhatsNewItem[]> {
  const since = now - WHATS_NEW_WINDOW_MS;
  const sorted = (await getApprovedListings())
    // A date in the future is not "new", it is a date nobody should trust.
    // The slug check drops the legacy rows whose "title" was a whole
    // paragraph, as the sitemap and llms.txt do.
    .filter((l) => listedAt(l) <= now && hasPublishableSlug(l.slug))
    .sort((a, b) => listedAt(b) - listedAt(a));
  const inWindow = sorted.filter((l) => listedAt(l) >= since).length;
  const picked = sorted.slice(0, Math.max(inWindow, WHATS_NEW_MAX_ROWS));

  const uids = [...new Set(picked.map((l) => l.sellerId))];
  const profiles = new Map(
    await Promise.all(
      uids.map(async (uid) => [uid, await getSellerProfile(uid)] as const)
    )
  );

  return picked.map((l) => {
    const p = profiles.get(l.sellerId);
    return {
      id: l.id,
      slug: l.slug,
      title: l.title,
      tagline: l.tagline,
      image: listingPoster(l),
      listedAt: listedAt(l),
      maker: {
        name: p?.displayName || l.sellerName,
        handle: p?.handle,
        xHandle: p?.xHandle,
        avatarUrl: p?.avatarUrl,
      },
    };
  });
}
