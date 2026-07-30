import { verifyRequestUid, getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { sendEmail } from "@/lib/email";
import { reviewDecisionSellerEmail } from "@/lib/emailTemplates";
import { siteOrigin } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Notify a seller that their listing was approved or rejected. Called by the
 * admin review page after it records the decision. Verifies the caller is an
 * admin, looks up the seller's email with the Admin SDK (clients can't read
 * other users' docs), and sends the note. Best-effort — never blocks the review.
 */
export async function POST(req: Request) {
  if (!adminConfigured) return Response.json({ ok: false }, { status: 200 });

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ ok: false }, { status: 401 });

  const db = getAdminDb();
  const caller = await db.collection("users").doc(uid).get();
  if (caller.data()?.role !== "admin") {
    return Response.json({ ok: false }, { status: 403 });
  }

  const { listingId, decision, note } = (await req.json().catch(() => ({}))) as {
    listingId?: string;
    decision?: "approved" | "rejected";
    note?: string;
  };
  if (!listingId || (decision !== "approved" && decision !== "rejected")) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const snap = await db.collection("listings").doc(listingId).get();
  const listing = snap.data() as
    | { title?: string; slug?: string; sellerId?: string }
    | undefined;
  if (!snap.exists || !listing?.sellerId) {
    return Response.json({ ok: false }, { status: 404 });
  }

  const sellerSnap = await db.collection("users").doc(listing.sellerId).get();
  const sellerEmail = sellerSnap.data()?.email as string | undefined;
  if (!sellerEmail) return Response.json({ ok: false }, { status: 200 });

  const origin = siteOrigin(req);
  const ok = await sendEmail({
    to: sellerEmail,
    ...reviewDecisionSellerEmail({
      decision,
      title: listing.title ?? "Your tool",
      note,
      listingUrl: `${origin}/app/${listing.slug ?? ""}`,
      dashboardUrl: `${origin}/dashboard`,
    }),
  });

  return Response.json({ ok });
}
