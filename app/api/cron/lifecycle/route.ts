import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { sendEmail, adminNotifyEmail, escapeHtml, emailShell } from "@/lib/email";
import {
  sellerNoListingEmail,
  SELLER_WELCOME_FROM,
  SELLER_WELCOME_REPLY_TO,
} from "@/lib/emailTemplates";
import { unsubscribeUrl } from "@/lib/emailLinks.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
/** How long a new seller has before the "no listing yet" nudge. */
const NO_LISTING_AFTER_MS = 3 * DAY_MS;
/** A hard ceiling per run, so a mistake in the query cannot mail everyone. */
const MAX_PER_RUN = 50;

/**
 * The daily lifecycle run, called by Vercel Cron (vercel.json) once a day.
 *
 * Today it has one email: the nudge to a seller with no listing three days
 * after becoming one. Every fact is read at send time, never scheduled ahead,
 * which is what makes the stop condition real: somebody who submitted a
 * listing yesterday is simply not found.
 *
 * A seller is due when all of these hold:
 *   - role is seller, read from Firestore;
 *   - they became a seller at least three days ago, taken from the welcome's
 *     own record (emailLog.sellerWelcomeAt) or, for accounts from before the
 *     welcome existed, the account's createdAt;
 *   - no document in `listings` has their sellerId, in any status (drafts
 *     live in the browser, so "never submitted" is the most we can see);
 *   - they have not had this email (emailLog.noListingNudgeAt) and have not
 *     unsubscribed (emailLog.optOut).
 *
 * DRY RUN unless LIFECYCLE_EMAILS=live. A dry run sends nothing to sellers and
 * records nothing; it emails the admin the list of who would have been sent
 * it, so the list can be read before it is trusted. Live, each send is claimed
 * in emailLog in a transaction first (so an overlapping run cannot double
 * send) and released if Resend fails, and the admin gets the list of who was
 * sent it. Either way the admin email only goes out when somebody is due.
 *
 * Refuses to run without CRON_SECRET, which Vercel Cron sends as a bearer
 * token, so nobody else can trigger a round of email.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (!adminConfigured) return Response.json({ ok: false, error: "not-configured" }, { status: 501 });

  const live = process.env.LIFECYCLE_EMAILS === "live";
  const db = getAdminDb();
  const auth = getAdminAuth();
  const now = Date.now();

  const sellers = await db.collection("users").where("role", "==", "seller").get();
  const due: { uid: string; email: string; since: number }[] = [];

  for (const doc of sellers.docs) {
    if (due.length >= MAX_PER_RUN) break;
    const uid = doc.id;
    const log = (await db.collection("emailLog").doc(uid).get()).data() ?? {};
    if (log.optOut || log.noListingNudgeAt) continue;

    const welcomeAt = (log.sellerWelcomeAt as Timestamp | undefined)?.toMillis();
    const createdAt = doc.data().createdAt;
    const since = welcomeAt ?? (typeof createdAt === "number" ? createdAt : undefined);
    if (!since || now - since < NO_LISTING_AFTER_MS) continue;

    const listing = await db.collection("listings").where("sellerId", "==", uid).limit(1).get();
    if (!listing.empty) continue;

    const user = await auth.getUser(uid).catch(() => null);
    if (!user?.email || user.disabled) continue;
    due.push({ uid, email: user.email, since });
  }

  const sent: string[] = [];
  const failed: string[] = [];

  if (live) {
    for (const d of due) {
      const logRef = db.collection("emailLog").doc(d.uid);
      const claimed = await db.runTransaction(async (tx) => {
        const log = (await tx.get(logRef)).data() ?? {};
        if (log.noListingNudgeAt || log.optOut) return false;
        tx.set(logRef, { noListingNudgeAt: FieldValue.serverTimestamp() }, { merge: true });
        return true;
      });
      if (!claimed) continue;

      const unsub = unsubscribeUrl(d.uid);
      const ok = await sendEmail({
        to: d.email,
        from: SELLER_WELCOME_FROM,
        replyTo: SELLER_WELCOME_REPLY_TO,
        ...sellerNoListingEmail(undefined, unsub),
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (ok) sent.push(d.email);
      else {
        failed.push(d.email);
        await logRef.update({ noListingNudgeAt: FieldValue.delete() });
      }
    }
  }

  if (due.length > 0) {
    const rows = (live ? sent : due.map((d) => d.email))
      .map((e) => `<li>${escapeHtml(e)}</li>`)
      .join("");
    const failedRows = failed.map((e) => `<li>${escapeHtml(e)}</li>`).join("");
    await sendEmail({
      to: adminNotifyEmail,
      subject: live
        ? `Sent the "no listing yet" tip to ${sent.length} seller${sent.length === 1 ? "" : "s"}`
        : `Dry run: the "no listing yet" tip would go to ${due.length} seller${due.length === 1 ? "" : "s"}`,
      html: emailShell(
        `<p>${
          live
            ? "Today's lifecycle run sent the no-listing tip to:"
            : "Dry run. Nothing was sent to sellers. Today's run would have sent the no-listing tip to:"
        }</p><ul>${rows || "<li>nobody</li>"}</ul>${
          failedRows ? `<p>Failed, will retry tomorrow:</p><ul>${failedRows}</ul>` : ""
        }${
          live
            ? ""
            : "<p>To send for real, set LIFECYCLE_EMAILS=live in Vercel Production and redeploy.</p>"
        }`
      ),
    });
  }

  return Response.json({
    ok: true,
    mode: live ? "live" : "dry-run",
    due: due.length,
    sent: sent.length,
    failed: failed.length,
  });
}
