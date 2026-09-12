/**
 * Send one of the seller emails to one or more addresses by hand.
 *
 *   npx tsx --env-file=.env.local scripts/send-seller-email.ts <email> <to...> [--live]
 *
 *   <email>   welcome | welcome-verify | verify | no-listing | rejected | approved
 *             (the confirm buttons and the last two use sample content)
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
  sellerRejectedEmail,
  sellerApprovedEmail,
  verifyEmail,
  SELLER_WELCOME_FROM,
  SELLER_WELCOME_REPLY_TO,
} from "../lib/emailTemplates";

/** Stands in for a real verification link in tests: real ones verify an account. */
const SAMPLE_VERIFY_URL = "https://www.thesolomarket.com/login";

const TEMPLATES: Record<string, (imageBase?: string) => { subject: string; html: string }> = {
  welcome: (imageBase) => sellerWelcomeEmail(imageBase),
  // The welcome as a brand-new, unverified seller gets it: with the confirm block.
  "welcome-verify": (imageBase) => sellerWelcomeEmail(imageBase, SAMPLE_VERIFY_URL),
  verify: (imageBase) => verifyEmail(SAMPLE_VERIFY_URL, imageBase),
  "no-listing": sellerNoListingEmail,
  // A sample rejection, to see the design with a formatted note in it.
  rejected: (imageBase) =>
    sellerRejectedEmail({
      title: "PDF Merger Pro",
      note: [
        "thanks for sending this in, the tool itself looks **really useful**. two things before it can go live:",
        "",
        "- the demo video stops before the merge finishes, so buyers never see the result",
        "- SETUP.md is missing from the zip. the checklist is at https://www.thesolomarket.com/docs/app-package",
        "",
        "if anything is unclear, just reply.",
      ].join("\n"),
      editUrl: "https://www.thesolomarket.com/dashboard",
      imageBase,
    }),
  // A sample approval with a note and the photo nudge, so both optional blocks show.
  approved: (imageBase) =>
    sellerApprovedEmail({
      title: "PDF Merger Pro",
      listingUrl: "https://www.thesolomarket.com/app/pdf-merger-pro",
      note: "loved the demo, it shows the whole thing working in under a minute. **nice work!**",
      hasPhoto: false,
      imageBase,
    }),
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
