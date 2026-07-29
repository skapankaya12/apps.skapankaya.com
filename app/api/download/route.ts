import {
  verifyRequestUid,
  getAdminDb,
  getAdminBucket,
  adminConfigured,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/** How long a download link stays valid. Short by design — it's re-minted on
 *  each click, so buyers never hold a durable, shareable link to the artifact. */
const URL_TTL_MS = 5 * 60 * 1000;

/**
 * Mint a short-lived signed URL for a listing's app package.
 *
 * The Storage rules deny direct client reads on submissions/ and apps/, so the
 * only way to the bytes is through this route. Access is granted to:
 *   - an admin (to inspect any submission during review),
 *   - the listing's own seller,
 *   - a buyer who owns a purchase of the listing.
 */
export async function POST(req: Request) {
  if (!adminConfigured) {
    return Response.json({ error: "not-configured" }, { status: 501 });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { listingId } = (await req.json().catch(() => ({}))) as {
    listingId?: string;
  };
  if (!listingId) return Response.json({ error: "bad-request" }, { status: 400 });

  const db = getAdminDb();
  const listingSnap = await db.collection("listings").doc(listingId).get();
  if (!listingSnap.exists) {
    return Response.json({ error: "no-listing" }, { status: 404 });
  }
  const listing = listingSnap.data() as {
    sellerId: string;
    packagePath?: string;
    title?: string;
    version?: string;
  };

  // Decide whether this caller is allowed the bytes.
  let allowed = listing.sellerId === uid;
  if (!allowed) {
    const userSnap = await db.collection("users").doc(uid).get();
    allowed = userSnap.data()?.role === "admin";
  }
  if (!allowed) {
    // A buyer qualifies if they own a purchase of this listing. Query by buyerId
    // only (auto-indexed) and match the listing in code, so no composite index
    // is needed.
    const owned = await db
      .collection("purchases")
      .where("buyerId", "==", uid)
      .get();
    allowed = owned.docs.some((d) => d.data().listingId === listingId);
  }
  if (!allowed) return Response.json({ error: "forbidden" }, { status: 403 });

  if (!listing.packagePath) {
    return Response.json({ error: "no-package" }, { status: 409 });
  }

  // A friendly filename for the download, e.g. "csv-cleaner-1.0.0.zip".
  const safeTitle = (listing.title ?? "package")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const filename = `${safeTitle}-${listing.version ?? "1.0.0"}.zip`;

  const [url] = await getAdminBucket()
    .file(listing.packagePath)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + URL_TTL_MS,
      responseDisposition: `attachment; filename="${filename}"`,
    });

  return Response.json({ url });
}
