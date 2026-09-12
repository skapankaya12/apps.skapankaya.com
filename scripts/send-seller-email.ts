/**
 * Send one of the seller emails to one or more addresses by hand.
 *
 *   npx tsx --env-file=.env.local scripts/send-seller-email.ts <email> <to...> [--live]
 *
 *   <email>   welcome | no-listing
 *   --live    send exactly what the site sends: the real subject, and images
 *             loaded from the live site. Use it for a real person, e.g. a
 *             seller who joined before an email existed.
 *   (default) a test: "[Test]" on the subject and the images attached inline
 *             (cid:), so it shows the real design even before public/email/
 *             is deployed.
 *
 * Same sender and reply-to as the automatic sends. Writes nothing to
 * Firestore, so it does not mark anyone as sent: only use --live for someone
 * the automatic send will never reach (see CURRENT_STATE §6).
 */

import { readFileSync, readdirSync } from "node:fs";
import { sendEmail, emailConfigured } from "../lib/email";
import {
  sellerWelcomeEmail,
  sellerNoListingEmail,
  SELLER_WELCOME_FROM,
  SELLER_WELCOME_REPLY_TO,
} from "../lib/emailTemplates";

const TEMPLATES: Record<string, (imageBase?: string) => { subject: string; html: string }> = {
  welcome: sellerWelcomeEmail,
  "no-listing": sellerNoListingEmail,
};

const args = process.argv.slice(2);
const live = args.includes("--live");
const [name, ...to] = args.filter((a) => a !== "--live");
const build = TEMPLATES[name ?? ""];

if (!build || to.length === 0 || to.some((a) => !a.includes("@"))) {
  console.error(
    `usage: send-seller-email.ts <${Object.keys(TEMPLATES).join(" | ")}> <address...> [--live]`
  );
  process.exit(1);
}
if (!emailConfigured) {
  console.error("RESEND_API_KEY and EMAIL_FROM must be set (run with --env-file=.env.local)");
  process.exit(1);
}

const { subject, html } = live ? build() : build("cid:");
const used = new Set([...html.matchAll(/src="cid:([^"]+)"/g)].map((m) => m[1]));
const attachments = readdirSync("public/email")
  .filter((f) => used.has(f))
  .map((f) => ({
    filename: f,
    content: readFileSync(`public/email/${f}`).toString("base64"),
    contentId: f,
  }));

(async () => {
  let failed = 0;
  // One message per address, so nobody sees anyone else's.
  for (const address of to) {
    const ok = await sendEmail({
      to: address,
      from: SELLER_WELCOME_FROM,
      replyTo: SELLER_WELCOME_REPLY_TO,
      subject: live ? subject : `[Test] ${subject}`,
      html,
      ...(live ? {} : { attachments }),
    });
    console.log(`${ok ? "sent" : "FAILED"}: ${name} to ${address}${live ? " (live)" : " (test)"}`);
    if (!ok) failed++;
  }
  process.exit(failed ? 1 : 0);
})();
