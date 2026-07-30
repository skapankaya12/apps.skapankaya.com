import { verifyRequestUid, getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { sendEmail, emailShell, adminNotifyEmail } from "@/lib/email";
import { siteOrigin } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Notify the admin that a new listing was submitted for review. Called by the
 * seller form right after it creates the listing. Best-effort: the seller's
 * submission already succeeded, so any failure here is logged, not surfaced.
 */
export async function POST(req: Request) {
  if (!adminConfigured) return Response.json({ ok: false }, { status: 200 });

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ ok: false }, { status: 401 });

  const { listingId } = (await req.json().catch(() => ({}))) as { listingId?: string };
  if (!listingId) return Response.json({ ok: false }, { status: 400 });

  const snap = await getAdminDb().collection("listings").doc(listingId).get();
  const listing = snap.data() as
    | { title?: string; sellerId?: string; sellerName?: string; priceCents?: number }
    | undefined;
  // Only the listing's own seller can trigger its submission notice.
  if (!snap.exists || listing?.sellerId !== uid) {
    return Response.json({ ok: false }, { status: 403 });
  }

  const origin = siteOrigin(req);
  const price = ((listing.priceCents ?? 0) / 100).toFixed(2);
  const ok = await sendEmail({
    to: adminNotifyEmail,
    subject: `New listing to review: ${listing.title ?? "Untitled"}`,
    html: emailShell(
      `<p>A new tool was submitted for review.</p>
       <p><strong>${listing.title ?? "Untitled"}</strong> — $${price}<br/>
       by ${listing.sellerName ?? "a seller"}</p>
       <p><a href="${origin}/admin/${listingId}">Open it in the review queue →</a></p>`
    ),
  });

  return Response.json({ ok });
}
