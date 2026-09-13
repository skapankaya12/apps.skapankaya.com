import {
  verifyRequestUid,
  getAdminDb,
  getAdminAuth,
  adminConfigured,
} from "@/lib/firebaseAdmin";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import { licenseKeyArrivedEmail } from "@/lib/emailTemplates";
import { siteOrigin } from "@/lib/stripe";
import { parseLicenseKeys, LICENSE_KEYS_PER_UPLOAD } from "@/lib/licenseKeys";
import {
  addLicenseKeys,
  fulfillPendingPurchases,
  getLicenseKeyStock,
  removeUnusedLicenseKeys,
  takeReviewKey,
} from "@/lib/licenseKeys.server";

export const runtime = "nodejs";

/*
  A listing's licence keys: add, count, clear, and one for review.

  The only door to listings/{id}/licenseKeys, which the Firestore rules close to
  every browser. Who may do what:

    GET     stock counts                     the listing's seller, or an admin
    POST    { keys } add a pasted batch      the listing's seller, or an admin
    POST    { action: "review-key" }         an admin only
    DELETE  remove every unused key          the listing's seller, or an admin

  No route hands a seller their keys back. They already have them, and a key
  that can be read back out is one more place for it to leak from.
*/

type Caller = { uid: string; isAdmin: boolean };
type Owned = { caller: Caller; listingId: string };

/** Resolve the caller and the listing, and check the caller may touch it. */
async function authorize(req: Request, listingId: unknown): Promise<Owned | Response> {
  if (!adminConfigured) {
    return Response.json({ error: "not-configured" }, { status: 501 });
  }
  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (typeof listingId !== "string" || !listingId || listingId.includes("/")) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  const db = getAdminDb();
  const [listing, user] = await Promise.all([
    db.collection("listings").doc(listingId).get(),
    db.collection("users").doc(uid).get(),
  ]);
  if (!listing.exists) return Response.json({ error: "no-listing" }, { status: 404 });
  const isAdmin = user.data()?.role === "admin";
  if (listing.data()?.sellerId !== uid && !isAdmin) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return { caller: { uid, isAdmin }, listingId };
}

export async function GET(req: Request) {
  const listingId = new URL(req.url).searchParams.get("listingId");
  const auth = await authorize(req, listingId);
  if (auth instanceof Response) return auth;
  try {
    return Response.json(await getLicenseKeyStock(auth.listingId));
  } catch (err) {
    console.error("[api/listing-keys GET]", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    listingId?: unknown;
    keys?: unknown;
    action?: unknown;
  };
  const auth = await authorize(req, body.listingId);
  if (auth instanceof Response) return auth;

  // Uploads are cheap to repeat and each one reads every key in the batch, so
  // a script hammering this is the thing to stop.
  const limit = rateLimit(`listing-keys:${auth.caller.uid}`, 30, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  try {
    if (body.action === "review-key") {
      if (!auth.caller.isAdmin) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }
      const key = await takeReviewKey(auth.listingId);
      if (!key) return Response.json({ error: "no-keys" }, { status: 409 });
      return Response.json({ key });
    }

    if (typeof body.keys !== "string") {
      return Response.json({ error: "bad-request" }, { status: 400 });
    }
    // Parsed here as well as in the form, because the form is not a control.
    const parsed = parseLicenseKeys(body.keys);
    if (parsed.keys.length > LICENSE_KEYS_PER_UPLOAD) {
      return Response.json({ error: "too-many" }, { status: 413 });
    }
    const result = await addLicenseKeys(auth.listingId, parsed.keys, auth.caller.uid);
    // Anyone who bought while the keys were out gets theirs now.
    if (result.added > 0) await deliverToWaitingBuyers(req, auth.listingId);
    const stock = await getLicenseKeyStock(auth.listingId);
    return Response.json({
      ...result,
      duplicates: parsed.duplicates,
      invalid: parsed.invalid,
      stock,
    });
  } catch (err) {
    console.error("[api/listing-keys POST]", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}

/**
 * Hand keys to buyers who were left waiting, and email each one. The key is on
 * their purchase whatever happens to the email, so a failed send is logged
 * and nothing more.
 */
async function deliverToWaitingBuyers(req: Request, listingId: string) {
  try {
    const fulfilled = await fulfillPendingPurchases(listingId);
    const origin = siteOrigin(req);
    await Promise.allSettled(
      fulfilled.map(async (f) => {
        const email = (await getAdminAuth().getUser(f.buyerId)).email;
        if (!email) return;
        await sendEmail({
          to: email,
          ...licenseKeyArrivedEmail({
            title: f.listingTitle,
            key: f.key,
            instructions: f.instructions,
            redeemUrl: f.redeemUrl,
            libraryUrl: `${origin}/library`,
          }),
        });
      })
    );
  } catch (err) {
    console.error("[api/listing-keys] delivering to waiting buyers failed:", err);
  }
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { listingId?: unknown };
  const auth = await authorize(req, body.listingId);
  if (auth instanceof Response) return auth;
  try {
    const removed = await removeUnusedLicenseKeys(auth.listingId);
    return Response.json({ removed, stock: await getLicenseKeyStock(auth.listingId) });
  } catch (err) {
    console.error("[api/listing-keys DELETE]", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
