import { verifyRequestUid, getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { sendEmail, emailShell } from "@/lib/email";
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
  const title = listing.title ?? "Your tool";
  const noteHtml = note?.trim()
    ? `<p style="background:#f7f7f8;border-radius:12px;padding:12px"><strong>Note from review:</strong><br/>${escapeHtml(note.trim())}</p>`
    : "";

  const body =
    decision === "approved"
      ? `<p><strong>${escapeHtml(title)}</strong> passed review and is now live on the marketplace. 🎉</p>
         ${noteHtml}
         <p><a href="${origin}/app/${listing.slug ?? ""}">View your listing →</a></p>`
      : `<p><strong>${escapeHtml(title)}</strong> wasn't approved this time.</p>
         ${noteHtml}
         <p>You can edit it and resubmit from your <a href="${origin}/dashboard">dashboard</a>.</p>`;

  const ok = await sendEmail({
    to: sellerEmail,
    subject:
      decision === "approved"
        ? `Approved: ${title} is live`
        : `Update on your listing: ${title}`,
    html: emailShell(body),
  });

  return Response.json({ ok });
}

/** Minimal HTML escaping for user-provided text placed into the email body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
