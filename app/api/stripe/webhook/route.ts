import type Stripe from "stripe";
import { stripe, stripeConfigured, siteOrigin } from "@/lib/stripe";
import { getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { sendEmail, adminNotifyEmail } from "@/lib/email";
import {
  purchaseReceiptBuyerEmail,
  saleSellerEmail,
  saleAdminEmail,
} from "@/lib/emailTemplates";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

/**
 * Stripe webhook. This is the ONLY place a `purchase` is recorded — the client
 * can't write that collection (Firestore rules deny it). We verify the Stripe
 * signature against the raw body, then act on the event with the Admin SDK.
 */
export async function POST(req: Request) {
  if (!stripeConfigured || !adminConfigured) {
    return Response.json({ error: "not-configured" }, { status: 501 });
  }

  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return Response.json({ error: "no-signature" }, { status: 400 });

  const body = await req.text(); // raw body required for signature verification
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return Response.json({ error: "invalid-signature" }, { status: 400 });
  }

  const db = getAdminDb();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const m = session.metadata ?? {};
    if (session.payment_status === "paid" && m.listingId && m.buyerId) {
      // Idempotent: keyed by session id, so webhook retries don't double-record.
      const purchaseRef = db.collection("purchases").doc(session.id);
      const existing = await purchaseRef.get();
      if (!existing.exists) {
        const amountCents = session.amount_total ?? 0;
        const title = m.listingTitle ?? "your tool";
        await purchaseRef.set({
          buyerId: m.buyerId,
          // From the checkout session's own metadata, so it records who was
          // actually paid rather than who owns the listing today. A seller's
          // earnings are summed from these rows, not from the listing's current
          // price, which can change after a sale.
          sellerId: m.sellerId ?? "",
          listingId: m.listingId,
          listingSlug: m.listingSlug ?? "",
          listingTitle: m.listingTitle ?? "",
          sellerName: m.sellerName ?? "",
          amountCents,
          purchasedVersion: m.purchasedVersion ?? "1.0.0",
          stripeSessionId: session.id,
          createdAt: Date.now(),
        });
        await db
          .collection("listings")
          .doc(m.listingId)
          .update({ salesCount: FieldValue.increment(1) });

        // Notify buyer, seller and admin (best-effort — never fail the webhook).
        try {
          const origin = siteOrigin(req);
          const buyerEmail = session.customer_details?.email ?? "";
          const sellerSnap = m.sellerId
            ? await db.collection("users").doc(m.sellerId).get()
            : null;
          const sellerEmail = sellerSnap?.data()?.email as string | undefined;

          const sends: Promise<unknown>[] = [];
          if (buyerEmail) {
            sends.push(
              sendEmail({
                to: buyerEmail,
                ...purchaseReceiptBuyerEmail({
                  title,
                  amountCents,
                  libraryUrl: `${origin}/library`,
                }),
              })
            );
          }
          if (sellerEmail) {
            sends.push(
              sendEmail({
                to: sellerEmail,
                ...saleSellerEmail({
                  title,
                  amountCents,
                  dashboardUrl: `${origin}/dashboard`,
                }),
              })
            );
          }
          sends.push(
            sendEmail({
              to: adminNotifyEmail,
              ...saleAdminEmail({
                title,
                buyerEmail: buyerEmail || "unknown",
                amountCents,
              }),
            })
          );
          await Promise.allSettled(sends);
        } catch (e) {
          console.error("[webhook] sale emails failed:", e);
        }
      }
    }
  }

  // Keep the seller's payout-readiness in sync as Stripe verifies their account.
  if (event.type === "account.updated") {
    const account = event.data.object;
    const uid = account.metadata?.uid;
    if (uid) {
      await db.collection("users").doc(uid).set(
        {
          stripeChargesEnabled: account.charges_enabled ?? false,
          stripePayoutsEnabled: account.payouts_enabled ?? false,
        },
        { merge: true }
      );
    }
  }

  return Response.json({ received: true });
}
