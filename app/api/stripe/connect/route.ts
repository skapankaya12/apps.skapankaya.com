import { stripe, stripeConfigured, siteOrigin } from "@/lib/stripe";
import { verifyRequestUid, getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";

/**
 * Seller payout onboarding (Stripe Connect Express).
 * Creates the seller's Express account on first call (monthly payouts), stores
 * its id on their user doc, and returns a Stripe-hosted onboarding link. The
 * seller completes identity/bank details on Stripe; we never see them.
 */
export async function POST(req: Request) {
  if (!stripeConfigured || !adminConfigured) {
    return Response.json({ error: "not-configured" }, { status: 501 });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) return Response.json({ error: "no-user" }, { status: 404 });
  const user = snap.data() as { email?: string; stripeAccountId?: string };

  let accountId = user.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      // Destination charges: the platform takes the payment, the connected
      // account just needs to receive transfers.
      capabilities: { transfers: { requested: true } },
      settings: {
        payouts: { schedule: { interval: "monthly", monthly_anchor: 1 } },
      },
      metadata: { uid },
    });
    accountId = account.id;
    await userRef.set({ stripeAccountId: accountId }, { merge: true });
  }

  const origin = siteOrigin(req);
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/dashboard?payouts=refresh`,
    return_url: `${origin}/dashboard?payouts=done`,
    type: "account_onboarding",
  });

  return Response.json({ url: link.url });
}
