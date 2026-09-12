import { verifyRequestUid, getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { sendEmail } from "@/lib/email";
import {
  sellerApprovedEmail,
  sellerRejectedEmail,
  SELLER_WELCOME_FROM,
  SELLER_WELCOME_REPLY_TO,
} from "@/lib/emailTemplates";
import { siteOrigin } from "@/lib/stripe";
import { brand } from "@/lib/brand";

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
  // Both decisions get a designed email from hello@, so the seller can reply.
  // A rejection carries the note as its body. An approval carries it only if
  // the admin wrote one (the review console fills in "Passed all checks."
  // otherwise), share links, and a photo nudge when the seller has no photo.
  const title = listing.title ?? "your tool";
  const content =
    decision === "rejected"
      ? sellerRejectedEmail({
          title,
          note: note?.trim() || "Did not pass review.",
          editUrl: `${origin}/dashboard/new?edit=${encodeURIComponent(listingId)}`,
        })
      : sellerApprovedEmail({
          title,
          // The public listing page, on the canonical origin: these links get
          // posted to social networks, so they must never be a preview URL.
          listingUrl: `${brand.url}/app/${listing.slug ?? ""}`,
          note: note?.trim() && note.trim() !== "Passed all checks." ? note : undefined,
          hasPhoto: Boolean(sellerSnap.data()?.avatarUrl),
        });
  const ok = await sendEmail({
    to: sellerEmail,
    from: SELLER_WELCOME_FROM,
    replyTo: SELLER_WELCOME_REPLY_TO,
    ...content,
  });

  return Response.json({ ok });
}
