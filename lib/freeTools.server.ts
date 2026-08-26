import { cache } from "react";
import { getAdminDb, adminConfigured } from "./firebaseAdmin";
import type { FreeTool } from "./types";

/**
 * Server-side reads of the free tools directory at /free.
 *
 * Same shape and same reasoning as lib/listings.server.ts: the page has to
 * render real HTML, because Googlebot only sees a client render on a second
 * pass and AI crawlers do not run JS at all. A directory that a crawler cannot
 * read is a directory that does nothing.
 *
 * Wrapped in React's cache() so generateMetadata and the page body share one
 * Firestore round-trip per request.
 *
 * Every read is scoped to status === "approved", which is the same slice the
 * security rules make world-readable. Nothing pending or rejected leaks out.
 */

function toFreeTool(d: FirebaseFirestore.QueryDocumentSnapshot): FreeTool {
  return { id: d.id, ...(d.data() as Omit<FreeTool, "id">) };
}

/** Every approved free tool, newest first. Empty when the Admin SDK is absent. */
export const getApprovedFreeTools = cache(async (): Promise<FreeTool[]> => {
  // `next build` runs without service-account env vars, and previews may too.
  // Degrade to an empty directory rather than failing the render.
  if (!adminConfigured) return [];
  try {
    const snap = await getAdminDb()
      .collection("freeTools")
      .where("status", "==", "approved")
      .get();
    return snap.docs.map(toFreeTool).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error("[freeTools.server] getApprovedFreeTools:", err);
    return [];
  }
});
