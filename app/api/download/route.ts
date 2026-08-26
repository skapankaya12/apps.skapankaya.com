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
 * Whether a stored packagePath actually belongs to this listing.
 *
 * Two shapes are legitimate:
 *   submissions/{sellerId}/…      — current, uid-scoped (see storage.rules)
 *   submissions/{listingId}.zip   — legacy flat layout, bound to this listing
 *
 * Anything else — another seller's folder, an `apps/` object, a traversal
 * attempt — is refused.
 */
function isOwnPackagePath(
  path: string,
  sellerId: string,
  listingId: string
): boolean {
  if (path.includes("..")) return false;
  if (path === `submissions/${listingId}.zip`) return true;
  return path.startsWith(`submissions/${sellerId}/`);
}

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
    status?: string;
  };

  // Decide whether — and why — this caller is allowed the bytes.
  const isSeller = listing.sellerId === uid;
  let isAdmin = false;
  if (!isSeller) {
    const userSnap = await db.collection("users").doc(uid).get();
    isAdmin = userSnap.data()?.role === "admin";
  }
  let isBuyer = false;
  if (!isSeller && !isAdmin) {
    // A buyer qualifies if they own a purchase of this listing. Query by buyerId
    // only (auto-indexed) and match the listing in code, so no composite index
    // is needed.
    const owned = await db
      .collection("purchases")
      .where("buyerId", "==", uid)
      .get();
    isBuyer = owned.docs.some((d) => d.data().listingId === listingId);
  }
  if (!isSeller && !isAdmin && !isBuyer) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  /*
    A buyer keeps their download for as long as the listing is one the platform
    still stands behind.

    `unlisted` is included deliberately. It means the seller stopped selling,
    which is their right and says nothing about the buyer, who paid once and was
    promised the tool forever. Pulling their download because the maker moved on
    would break the single clearest promise this marketplace makes.

    `rejected` is different: that is the platform withdrawing the tool for
    cause, and a refund is the right remedy rather than a download. Admins and
    the seller can still fetch it in every state.
  */
  const BUYER_DOWNLOADABLE = ["approved", "unlisted"];
  if (isBuyer && !BUYER_DOWNLOADABLE.includes(listing.status ?? "")) {
    return Response.json({ error: "unavailable" }, { status: 403 });
  }

  if (!listing.packagePath) {
    return Response.json({ error: "no-package" }, { status: 409 });
  }

  // Never hand the bucket a path we haven't bound to this listing's own seller.
  // packagePath lives on the listing doc, and the Firestore rules let a seller
  // edit their own listing while it's pending or rejected — so without this
  // check a seller could point their cheap listing at a rival's package (or at
  // any other object in the bucket, since the Admin SDK ignores Storage rules)
  // and resell someone else's work.
  if (!isOwnPackagePath(listing.packagePath, listing.sellerId, listingId)) {
    console.error(
      "[download] rejected packagePath %s on listing %s",
      listing.packagePath,
      listingId
    );
    return Response.json({ error: "no-package" }, { status: 409 });
  }

  // A friendly filename for the download, e.g. "csv-cleaner-1.0.0.zip".
  const safeTitle = (listing.title ?? "package")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Take the extension from what was actually stored. Packages are no longer
  // always zips, and handing a buyer a .dmg named .zip means macOS refuses to
  // open the thing they just paid for.
  const storedExt = /\.[a-z0-9]+$/i.exec(listing.packagePath)?.[0] ?? ".zip";
  const filename = `${safeTitle}-${listing.version ?? "1.0.0"}${storedExt.toLowerCase()}`;

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
