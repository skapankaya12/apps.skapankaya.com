import { stripe, stripeConfigured } from "@/lib/stripe";
import { verifyRequestUid, getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Sync a seller's payout readiness from Stripe onto their user doc. We took the
 * `account.updated` webhook off the wire, so the dashboard calls this instead —
 * on load and right after the seller returns from Express onboarding — to flip
 * the "Active" badge. Retrieves the connected account and mirrors its
 * charges/payouts flags; the live user-doc listener updates the UI reactively.
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
  const accountId = (snap.data() as { stripeAccountId?: string } | undefined)
    ?.stripeAccountId;
  if (!accountId) return Response.json({ started: false });

  const account = await stripe.accounts.retrieve(accountId);
  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;

  await userRef.set(
    {
      stripeChargesEnabled: chargesEnabled,
      stripePayoutsEnabled: payoutsEnabled,
    },
    { merge: true }
  );

  return Response.json({
    started: true,
    chargesEnabled,
    payoutsEnabled,
  });
}
