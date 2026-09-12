/**
 * Send the seller welcome email to one address, to see it in a real inbox.
 *
 *   npx tsx --env-file=.env.local scripts/send-welcome-test.ts you@example.com
 *
 * The images are attached to the message and referenced as cid: rather than
 * loaded from the live site, so a test shows the real design even before
 * public/email/ has been deployed. Real sends load them from the site.
 *
 * Sends exactly what /api/notify/welcome sends, same sender and reply-to,
 * with "[Test]" on the subject. Writes nothing to Firestore.
 */

import { readFileSync, readdirSync } from "node:fs";
import { sendEmail, emailConfigured } from "../lib/email";
import {
  sellerWelcomeEmail,
  SELLER_WELCOME_FROM,
  SELLER_WELCOME_REPLY_TO,
} from "../lib/emailTemplates";

const to = process.argv[2];
if (!to || !to.includes("@")) {
  console.error("usage: send-welcome-test.ts <email address>");
  process.exit(1);
}
if (!emailConfigured) {
  console.error("RESEND_API_KEY and EMAIL_FROM must be set (run with --env-file=.env.local)");
  process.exit(1);
}

const { subject, html } = sellerWelcomeEmail("cid:");
const used = new Set([...html.matchAll(/src="cid:([^"]+)"/g)].map((m) => m[1]));
const attachments = readdirSync("public/email")
  .filter((f) => used.has(f))
  .map((f) => ({
    filename: f,
    content: readFileSync(`public/email/${f}`).toString("base64"),
    contentId: f,
  }));

sendEmail({
  to,
  from: SELLER_WELCOME_FROM,
  replyTo: SELLER_WELCOME_REPLY_TO,
  subject: `[Test] ${subject}`,
  html,
  attachments,
}).then((ok) => {
  console.log(ok ? `sent to ${to} (${attachments.length} inline images)` : "send failed, see the error above");
  process.exit(ok ? 0 : 1);
});
