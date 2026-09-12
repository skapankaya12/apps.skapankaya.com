import { FieldValue } from "firebase-admin/firestore";
import {
  verifyRequestUid,
  getAdminAuth,
  getAdminDb,
  adminConfigured,
} from "@/lib/firebaseAdmin";
import { sendEmail } from "@/lib/email";
import {
  sellerWelcomeEmail,
  SELLER_WELCOME_FROM,
  SELLER_WELCOME_REPLY_TO,
} from "@/lib/emailTemplates";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { emailVerificationLink } from "@/lib/verification.server";
import { siteOrigin } from "@/lib/stripe";

export const runtime = "nodejs";

// The route sends at most once per account anyway; this only stops a loop from
// hammering Firestore and the Auth lookup.
const WELCOME_LIMIT = 5;
const WELCOME_WINDOW_MS = 60 * 60 * 1000;

/**
 * Send the seller welcome email, once per account, ever.
 *
 * Called by the client straight after an account is promoted to seller (see
 * becomeSeller and setRole in lib/store.ts). The client only says "now"; every
 * fact is checked here:
 *
 * - The role is read from Firestore, so calling this as a buyer sends nothing.
 * - The address comes from Firebase Auth, not from the user document, which the
 *   user can write. Otherwise anyone could point a welcome at a stranger.
 * - "Already sent" lives in emailLog/{uid}, a collection the rules give clients
 *   no access to, so it cannot be cleared to get the email again. It is claimed
 *   in a transaction before sending, so two tabs cannot both send, and released
 *   if Resend fails, so a failure is retried on the next promotion rather than
 *   lost.
 *
 * While the address is unverified, the welcome also carries the "confirm your
 * email" button, so a new seller gets one email at signup instead of the
 * welcome plus a verification email. The response says whether it did
 * (`verification`), so the signup form can send the plain verification email
 * instead when it did not (already welcomed, or the send failed).
 *
 * SELLER_WELCOME_EMAIL=off switches it off without a deploy.
 */
export async function POST(req: Request) {
  if (!adminConfigured) return Response.json({ ok: false }, { status: 200 });
  if (process.env.SELLER_WELCOME_EMAIL === "off") {
    return Response.json({ ok: false, reason: "disabled", verification: false });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ ok: false }, { status: 401 });

  const limit = rateLimit(`notify-welcome:${uid}`, WELCOME_LIMIT, WELCOME_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit);

  const db = getAdminDb();
  const user = await db.collection("users").doc(uid).get();
  if (user.data()?.role !== "seller") {
    return Response.json({ ok: false, reason: "not-a-seller" }, { status: 409 });
  }

  const account = await getAdminAuth().getUser(uid);
  const email = account.email;
  if (!email) return Response.json({ ok: false, reason: "no-email", verification: false });

  const logRef = db.collection("emailLog").doc(uid);
  const claimed = await db.runTransaction(async (tx) => {
    const log = await tx.get(logRef);
    if (log.data()?.sellerWelcomeAt) return false;
    tx.set(logRef, { sellerWelcomeAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
  if (!claimed) return Response.json({ ok: true, reason: "already-sent", verification: false });

  const verifyUrl = account.emailVerified
    ? undefined
    : await emailVerificationLink(email, `${siteOrigin(req)}/dashboard/new`).catch((err) => {
        console.error("[welcome] could not make a verification link:", err);
        return undefined;
      });

  const ok = await sendEmail({
    to: email,
    from: SELLER_WELCOME_FROM,
    replyTo: SELLER_WELCOME_REPLY_TO,
    ...sellerWelcomeEmail(undefined, verifyUrl),
  });
  if (!ok) await logRef.update({ sellerWelcomeAt: FieldValue.delete() });

  return Response.json({ ok, verification: ok && Boolean(verifyUrl) });
}
