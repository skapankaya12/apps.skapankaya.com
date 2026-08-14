import { cache } from "react";
import { getAdminDb, adminConfigured } from "./firebaseAdmin";
import {
  DEFAULT_CATEGORIES,
  sortCategories,
  categoryLabel,
  type Category,
  type CategoryDef,
} from "./types";

/**
 * Server-side reads of the browse filters, via the Admin SDK — the categories
 * counterpart to listings.server.ts, and for the same reason: the labels appear
 * in the JSON-LD and the social card, which are consumed by crawlers that never
 * run the client store's listener.
 *
 * Falls back to DEFAULT_CATEGORIES whenever Firestore isn't there to ask (no
 * service account during `next build`, a failed read), so a label is never
 * missing from a page that's already rendering.
 */
export const getCategoriesServer = cache(async (): Promise<CategoryDef[]> => {
  if (!adminConfigured) return DEFAULT_CATEGORIES;
  try {
    const snap = await getAdminDb().collection("categories").get();
    if (snap.empty) return DEFAULT_CATEGORIES;
    return sortCategories(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CategoryDef, "id">),
      }))
    );
  } catch (err) {
    console.error("[categories.server] getCategoriesServer:", err);
    return DEFAULT_CATEGORIES;
  }
});

/** Display label for a category id, resolved against the live filters. */
export async function getCategoryLabelServer(id: Category): Promise<string> {
  return categoryLabel(id, await getCategoriesServer());
}
