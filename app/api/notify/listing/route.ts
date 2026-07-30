import { verifyRequestUid, getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { sendEmail, adminNotifyEmail } from "@/lib/email";
import { newListingAdminEmail } from "@/lib/emailTemplates";
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
  const ok = await sendEmail({
    to: adminNotifyEmail,
    ...newListingAdminEmail({
      title: listing.title ?? "Untitled",
      priceCents: listing.priceCents ?? 0,
      sellerName: listing.sellerName ?? "a seller",
      reviewUrl: `${origin}/admin/${listingId}`,
    }),
  });

  return Response.json({ ok });
}
