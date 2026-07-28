import { stripe, stripeConfigured, siteOrigin, COMMISSION_RATE } from "@/lib/stripe";
import { verifyRequestUid, getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Create a Stripe Checkout Session for one listing, as a Connect destination
 * charge: the buyer pays the platform, we keep a 15% application fee, and the
 * remainder transfers to the seller's connected account. Stripe processing fees
 * come out of our fee (the platform absorbs them).
 */
export async function POST(req: Request) {
  if (!stripeConfigured || !adminConfigured) {
    return Response.json({ error: "not-configured" }, { status: 501 });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { listingId } = (await req.json().catch(() => ({}))) as { listingId?: string };
  if (!listingId) return Response.json({ error: "bad-request" }, { status: 400 });

  const db = getAdminDb();
  const listingSnap = await db.collection("listings").doc(listingId).get();
  if (!listingSnap.exists) return Response.json({ error: "no-listing" }, { status: 404 });
  const listing = listingSnap.data() as {
    slug: string; title: string; tagline?: string; priceCents: number;
    status: string; sellerId: string; sellerName?: string; version?: string;
  };

  if (listing.status !== "approved") {
    return Response.json({ error: "not-available" }, { status: 400 });
  }
  if (listing.sellerId === uid) {
    return Response.json({ error: "own-listing" }, { status: 400 });
  }

  // Seller must have finished payout onboarding and be able to receive funds.
  const sellerSnap = await db.collection("users").doc(listing.sellerId).get();
  const seller = sellerSnap.data() as { stripeAccountId?: string } | undefined;
  if (!seller?.stripeAccountId) {
    return Response.json({ error: "seller-not-ready" }, { status: 409 });
  }
  const account = await stripe.accounts.retrieve(seller.stripeAccountId);
  if (!account.charges_enabled) {
    return Response.json({ error: "seller-not-ready" }, { status: 409 });
  }

  const amount = listing.priceCents;
  const fee = Math.round(amount * COMMISSION_RATE);
  const origin = siteOrigin(req);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: listing.title,
            description: listing.tagline || undefined,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: fee,
      transfer_data: { destination: seller.stripeAccountId },
    },
    // The webhook reads these to record the purchase server-side.
    metadata: {
      buyerId: uid,
      listingId,
      listingSlug: listing.slug,
      listingTitle: listing.title,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName ?? "",
      purchasedVersion: listing.version ?? "1.0.0",
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/app/${listing.slug}`,
  });

  return Response.json({ url: session.url });
}
