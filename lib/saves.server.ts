import { cache } from "react";
import { getAdminDb, adminConfigured } from "./firebaseAdmin";

/**
 * How many people have saved a listing, counted on the server.
 *
 * Counted here rather than read from the client because a save is private: the
 * Firestore rules let each person read only their own. Going through the Admin
 * SDK is what lets the marketplace publish a number without publishing the list
 * of who is interested in what.
 *
 * Uses an aggregation query, so the cost does not grow with the number of
 * saves: Firestore returns the count without sending the documents.
 */

export { PUBLIC_SAVE_THRESHOLD } from "./saves";

export const getSaveCount = cache(async (listingId: string): Promise<number> => {
  if (!adminConfigured) return 0;
  try {
    const snap = await getAdminDb()
      .collection("bookmarks")
      .where("listingId", "==", listingId)
      .count()
      .get();
    return snap.data().count;
  } catch (err) {
    console.error("[saves.server] getSaveCount:", err);
    return 0;
  }
});

/**
 * Save counts for several listings at once, keyed by listing id.
 *
 * One aggregation query per listing, run together. Fine for a seller's own
 * dashboard, which is a handful of tools; do not point this at the catalogue.
 */
export async function getSaveCounts(
  listingIds: string[]
): Promise<Record<string, number>> {
  const counts = await Promise.all(listingIds.map((id) => getSaveCount(id)));
  return Object.fromEntries(listingIds.map((id, i) => [id, counts[i]]));
}
