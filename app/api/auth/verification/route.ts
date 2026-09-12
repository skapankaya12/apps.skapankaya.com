import { verifyRequestUid, getAdminAuth, getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { sendEmail } from "@/lib/email";
import { verifyEmail, SELLER_WELCOME_FROM, SELLER_WELCOME_REPLY_TO } from "@/lib/emailTemplates";
import { emailVerificationLink } from "@/lib/verification.server";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { siteOrigin } from "@/lib/stripe";

export const runtime = "nodejs";

// A person pressing "resend" a few times is fine; a script mailing itself is not.
const VERIFY_LIMIT = 5;
const VERIFY_WINDOW_MS = 60 * 60 * 1000;

/**
 * Send the caller our designed verification email (design/emails/verify.html),
 * in place of Firebase's own, which cannot be designed. Used at signup for
 * anyone who is not getting the seller welcome (which carries the same link),
 * and by the "resend" button on the verify banner.
 *
 * The address is the one on the caller's Firebase account, never taken from
 * the request, and an already-verified account is sent nothing. After
 * verifying, Firebase's page continues to the dashboard for a seller and the
 * catalogue for anyone else.
 */
export async function POST(req: Request) {
  if (!adminConfigured) return Response.json({ ok: false, error: "not-configured" }, { status: 501 });

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ ok: false }, { status: 401 });

  const limit = rateLimit(`verify-email:${uid}`, VERIFY_LIMIT, VERIFY_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit);

  const account = await getAdminAuth().getUser(uid);
  if (!account.email) return Response.json({ ok: false, error: "no-email" }, { status: 400 });
  if (account.emailVerified) return Response.json({ ok: true, already: true });

  const role = (await getAdminDb().collection("users").doc(uid).get()).data()?.role;
  const next = role === "seller" ? "/dashboard" : "/browse";
  // Firebase throttles link requests per address (TOO_MANY_ATTEMPTS_TRY_LATER
  // after a few in quick succession), which a person pressing "resend" can
  // hit. Say so as a 429, which the banner shows as "try again shortly".
  let link: string;
  try {
    link = await emailVerificationLink(account.email, `${siteOrigin(req)}${next}`);
  } catch (err) {
    const throttled = String(err).includes("TOO_MANY_ATTEMPTS");
    if (!throttled) console.error("[verification] could not make a link:", err);
    return Response.json(
      { ok: false, error: throttled ? "try-later" : "link-failed" },
      { status: throttled ? 429 : 502 }
    );
  }

  const ok = await sendEmail({
    to: account.email,
    from: SELLER_WELCOME_FROM,
    replyTo: SELLER_WELCOME_REPLY_TO,
    ...verifyEmail(link),
  });
  return Response.json({ ok }, { status: ok ? 200 : 502 });
}
