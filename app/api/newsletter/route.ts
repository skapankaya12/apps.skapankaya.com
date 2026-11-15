import { FieldValue } from "firebase-admin/firestore";
import { adminConfigured, getAdminDb } from "@/lib/firebaseAdmin";
import { emailConfigured, sendEmail } from "@/lib/email";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { NEWSLETTER, confirmEmail, confirmUrl, normaliseEmail, subscriberId } from "@/lib/newsletter.server";

export const runtime = "nodejs";

/** Five sign-up attempts an hour from one address is plenty for a person. */
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Sign up for the Thursday email. Saves the address as pending and sends the
 * confirmation link; nothing else is ever sent until that link is clicked.
 *
 * `company` is a hidden field people never see. A form that fills it in is a
 * bot, and gets the same "check your inbox" answer as everyone else, so it
 * learns nothing, but nothing is saved or sent.
 *
 * Answers: 200 { status: "pending" | "already" }, 400 for a bad address, 429,
 * 503 when the site cannot store or send. In development without email set
 * up, the confirmation link comes back in `devConfirmUrl` so the flow can be
 * tried locally; production never returns it.
 */
export async function POST(req: Request) {
  const limit = rateLimit(`newsletter:${clientIp(req)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit);

  const body = (await req.json().catch(() => ({}))) as { email?: unknown; company?: unknown };
  if (typeof body.company === "string" && body.company.trim()) {
    return Response.json({ status: "pending" });
  }
  const email = normaliseEmail(body.email);
  if (!email) return Response.json({ error: "invalid_email" }, { status: 400 });
  if (!adminConfigured) return Response.json({ error: "not_configured" }, { status: 503 });

  const ref = getAdminDb().collection(NEWSLETTER).doc(subscriberId(email));
  const existing = await ref.get();
  if (existing.exists && existing.get("status") === "confirmed") {
    return Response.json({ status: "already" });
  }

  await ref.set(
    {
      email,
      status: "pending",
      createdAt: existing.exists ? existing.get("createdAt") : FieldValue.serverTimestamp(),
      requestedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const dev = process.env.NODE_ENV !== "production";
  const here = new URL(req.url).origin;
  if (!emailConfigured) {
    if (dev) return Response.json({ status: "pending", devConfirmUrl: confirmUrl(email, here) });
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  const mail = confirmEmail(email);
  const sent = await sendEmail({ to: email, ...mail, from: process.env.SELLER_WELCOME_FROM || undefined });
  if (!sent) return Response.json({ error: "send_failed" }, { status: 503 });
  return Response.json({ status: "pending", ...(dev ? { devConfirmUrl: confirmUrl(email, here) } : {}) });
}
