import { emailShell, escapeHtml } from "@/lib/email";
import { COMMISSION_RATE } from "@/lib/stripe";
import { brand } from "@/lib/brand";
import { SELLER_WELCOME_HTML } from "@/lib/emails/sellerWelcome";
import { SELLER_NO_LISTING_HTML } from "@/lib/emails/sellerNoListing";
import { SELLER_REJECTED_HTML } from "@/lib/emails/sellerRejected";
import { SELLER_APPROVED_HTML } from "@/lib/emails/sellerApproved";
import { VERIFY_EMAIL_HTML } from "@/lib/emails/verifyEmail";
import { noteToEmailHtml } from "@/lib/noteEmail";
import { LICENSE_KEYS_LOW } from "@/lib/licenseKeys";
import { safeHttpsUrl } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   All transactional email copy lives here — one place to edit the wording.
   Each function returns { subject, html }. User-supplied text (titles, notes)
   is escaped; URLs are built by the caller from the request origin.
--------------------------------------------------------------------------- */

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Keep or drop a {{#NAME}}...{{/NAME}} block from a generated template. */
function section(html: string, name: string, keep: boolean): string {
  const open = `{{#${name}}}`;
  const close = `{{/${name}}}`;
  const a = html.indexOf(open);
  const b = html.indexOf(close);
  if (a < 0 || b < 0) return html;
  return keep
    ? html.slice(0, a) + html.slice(a + open.length, b) + html.slice(b + close.length)
    : html.slice(0, a) + html.slice(b + close.length);
}

/**
 * To a new seller, once, when their account becomes a seller account.
 *
 * The exception to "all copy lives here": this one is a designed email, so its
 * words and layout live in design/emails/welcome.html, where it is previewed,
 * and design/emails/build-template.mjs compiles that into
 * lib/emails/sellerWelcome.ts. Edit the HTML, re-run the script.
 *
 * It comes from hello@, not noreply, because it asks for replies; the name
 * shown is just the brand (Sevval's call, 12 September). SELLER_WELCOME_FROM
 * overrides the whole sender without a code change. Images load from
 * public/email/ on the live site, so a new image there only shows up in mail
 * once it is deployed.
 */
export const SELLER_WELCOME_FROM =
  process.env.SELLER_WELCOME_FROM || `${brand.name} <hello@${brand.domain}>`;
export const SELLER_WELCOME_REPLY_TO = `hello@${brand.domain}`;

/**
 * `verifyUrl`, when given, shows the "first, confirm your email" block: the
 * welcome doubles as the verification email for a new seller, so they get one
 * message at signup rather than two. Omitted once the address is verified.
 */
export function sellerWelcomeEmail(imageBase = `${brand.url}/email/`, verifyUrl?: string) {
  return {
    subject: "guess what? happy to have you!",
    html: section(SELLER_WELCOME_HTML, "VERIFY", Boolean(verifyUrl))
      .replaceAll("{{IMG}}", imageBase)
      .replaceAll("{{VERIFY_URL}}", escapeHtml(verifyUrl ?? "")),
  };
}

/**
 * Email verification for an account that is not getting the seller welcome:
 * buyers at signup, and anyone pressing "resend" on the verify banner.
 * Designed in design/emails/verify.html. Replaces Firebase's own, undesignable
 * verification email; the link inside is still Firebase's (lib/verification.server).
 */
export function verifyEmail(verifyUrl: string, imageBase = `${brand.url}/email/`) {
  const url = escapeHtml(verifyUrl);
  return {
    subject: "confirm your email for The Solo Market",
    html: VERIFY_EMAIL_HTML.replaceAll("{{IMG}}", imageBase)
      .replaceAll("{{VERIFY_URL}}", url)
      .replaceAll("{{VERIFY_URL_TEXT}}", url),
  };
}

/**
 * To a seller with no listing three days after becoming one. Designed in
 * design/emails/no-listing.html, same as the welcome, and sent by the daily
 * lifecycle cron (app/api/cron/lifecycle). Unlike the welcome it is not an
 * account email, so it carries a per-person unsubscribe link.
 */
export function sellerNoListingEmail(
  imageBase = `${brand.url}/email/`,
  unsubscribeUrl = `${brand.url}/api/email/unsubscribe`
) {
  return {
    subject: "your first listing, the short version",
    html: SELLER_NO_LISTING_HTML.replaceAll("{{IMG}}", imageBase).replaceAll(
      "{{UNSUBSCRIBE}}",
      unsubscribeUrl.replaceAll("&", "&amp;")
    ),
  };
}

/**
 * To a seller whose listing was rejected, carrying the review note as the
 * admin wrote it in the review console (formatting and screenshots included,
 * via lib/noteEmail). Designed in design/emails/rejected.html. An account
 * email about their own listing, so no unsubscribe.
 */
export function sellerRejectedEmail(a: {
  title: string;
  note: string;
  editUrl: string;
  imageBase?: string;
}) {
  const title = escapeHtml(a.title);
  return {
    subject: `a quick note on ${a.title}`,
    html: SELLER_REJECTED_HTML.replaceAll("{{IMG}}", a.imageBase ?? `${brand.url}/email/`)
      .replaceAll("{{TITLE}}", title)
      .replaceAll("{{EDIT_URL}}", escapeHtml(a.editUrl))
      .replace("{{NOTE}}", noteToEmailHtml(a.note)),
  };
}

/** The words a seller's share links fill in. Kept here so they are edited once. */
export const SHARE_TEXT = "hey! now you can find me on thesolomarket.com \u{1F389}";

/**
 * Links that open each network's own composer with the post filled in. No API
 * and no login on our side; the listing page's OG image makes the preview card.
 * LinkedIn's share URL takes only the link, so it gets no text.
 */
export function shareLinks(listingUrl: string) {
  const text = encodeURIComponent(SHARE_TEXT);
  const url = encodeURIComponent(listingUrl);
  const both = encodeURIComponent(`${SHARE_TEXT} ${listingUrl}`);
  return {
    x: `https://x.com/intent/post?text=${text}&url=${url}`,
    bluesky: `https://bsky.app/intent/compose?text=${both}`,
    threads: `https://www.threads.net/intent/post?text=${both}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  };
}

/**
 * To a seller whose listing was approved: it is live, a button to see it,
 * share links with the post written for them, the review note if one was
 * written, and a nudge to add a photo for the builders wall if they have none.
 * Designed in design/emails/approved.html. An account email, no unsubscribe.
 */
export function sellerApprovedEmail(a: {
  title: string;
  listingUrl: string;
  /** The review note, if it says more than the default. */
  note?: string;
  hasPhoto: boolean;
  imageBase?: string;
}) {
  const share = shareLinks(a.listingUrl);
  let html = SELLER_APPROVED_HTML;
  html = section(html, "NOTE", Boolean(a.note?.trim()));
  html = section(html, "NO_PHOTO", !a.hasPhoto);
  return {
    subject: `${a.title} is live!`,
    html: html
      .replaceAll("{{IMG}}", a.imageBase ?? `${brand.url}/email/`)
      .replaceAll("{{TITLE}}", escapeHtml(a.title))
      .replaceAll("{{LISTING_URL}}", escapeHtml(a.listingUrl))
      .replaceAll("{{LISTING_URL_SHORT}}", escapeHtml(a.listingUrl.replace(/^https:\/\/(www\.)?/, "")))
      .replaceAll("{{SHARE_X}}", escapeHtml(share.x))
      .replaceAll("{{SHARE_BLUESKY}}", escapeHtml(share.bluesky))
      .replaceAll("{{SHARE_THREADS}}", escapeHtml(share.threads))
      .replaceAll("{{SHARE_LINKEDIN}}", escapeHtml(share.linkedin))
      .replace("{{NOTE}}", a.note ? noteToEmailHtml(a.note) : ""),
  };
}

/** To the admin: a seller submitted a new listing for review. */
export function newListingAdminEmail(a: {
  title: string;
  priceCents: number;
  sellerName: string;
  reviewUrl: string;
}) {
  return {
    subject: `New listing to review: ${a.title}`,
    html: emailShell(
      `<p>A new tool was submitted for review.</p>
       <p><strong>${escapeHtml(a.title)}</strong> — ${money(a.priceCents)}<br/>
       by ${escapeHtml(a.sellerName)}</p>
       <p><a href="${a.reviewUrl}">Open it in the review queue →</a></p>`
    ),
  };
}

/**
 * The licence key block in a receipt. A copy for convenience: the key is on the
 * purchase and always shown in the Library, so a lost or late email loses
 * nothing.
 */
function licenseBlock(license: {
  key: string | null;
  instructions: string;
  redeemUrl: string;
}): string {
  if (!license.key) {
    return `<p style="background:#fff7e6;border-radius:12px;padding:12px">
       <strong>Your license key is on its way.</strong><br/>
       The last key for this tool went a moment before your order, so we've
       asked the maker for more. It will appear in your library as soon as it
       arrives, and we'll let you know.</p>`;
  }
  const redeem = safeHttpsUrl(license.redeemUrl);
  return `<p style="background:#f7f7f8;border-radius:12px;padding:12px">
     <strong>Your license key</strong><br/>
     <code style="font-family:ui-monospace,Menlo,monospace;font-size:14px;word-break:break-all">${escapeHtml(license.key)}</code>
     ${license.instructions ? `<br/><span style="color:#6b6b76">${escapeHtml(license.instructions)}</span>` : ""}
     ${redeem ? `<br/><a href="${escapeHtml(redeem)}">Redeem it here</a>` : ""}
   </p>`;
}

/** To a buyer who was waiting for a licence key, once the seller restocked. */
export function licenseKeyArrivedEmail(a: {
  title: string;
  key: string;
  instructions: string;
  redeemUrl: string;
  libraryUrl: string;
}) {
  return {
    subject: `Your license key for ${a.title}`,
    html: emailShell(
      `<p>Your license key for <strong>${escapeHtml(a.title)}</strong> is here.</p>
       ${licenseBlock({ key: a.key, instructions: a.instructions, redeemUrl: a.redeemUrl })}
       <p>It's also saved in your <a href="${a.libraryUrl}">library</a>, next to the download.</p>`
    ),
  };
}

/** To the buyer: purchase receipt + how to download + the 14-day guarantee. */
export function purchaseReceiptBuyerEmail(a: {
  title: string;
  amountCents: number;
  libraryUrl: string;
  /** Present when the tool needs a licence key. `key` is null if none was left. */
  license?: { key: string | null; instructions: string; redeemUrl: string };
}) {
  return {
    subject: `Your receipt for ${a.title}`,
    html: emailShell(
      `<p>Thanks for your purchase! Here's your receipt.</p>
       <p><strong>${escapeHtml(a.title)}</strong><br/>
       Paid: ${money(a.amountCents)}</p>
       ${a.license ? licenseBlock(a.license) : ""}
       <p>Download it any time from your library — it's yours forever:</p>
       <p><a href="${a.libraryUrl}">Go to your library →</a></p>
       <p style="color:#6b6b76;font-size:13px">Covered by our 14-day
       &ldquo;it runs or your money back&rdquo; guarantee. If it won't run on
       your machine within 14 days, you get a full refund.</p>`
    ),
  };
}

/**
 * To the seller: they made a sale.
 *
 * This used to say the payout was held until the 14-day refund window closed.
 * It isn't: the Stripe setup is a destination charge with transfer_data, so
 * the seller's share moves to their connected account immediately and Stripe
 * pays it out on their normal monthly schedule. If a delayed/separate-transfer
 * hold is ever implemented, this copy changes back — not before.
 */
export function saleSellerEmail(a: {
  title: string;
  amountCents: number;
  dashboardUrl: string;
  /** Present when the tool needs licence keys. `left` is null if unknown. */
  keys?: { left: number | null; pending: boolean };
}) {
  const sellerCut = Math.round(a.amountCents * (1 - COMMISSION_RATE));
  const keys = a.keys
    ? a.keys.pending
      ? `<p style="background:#fdecec;border-radius:12px;padding:12px">
           <strong>This buyer is waiting for a license key.</strong><br/>
           You ran out at the moment they bought. Add keys from your
           <a href="${a.dashboardUrl}">dashboard</a> and we'll send them theirs.
           Your listing stays paused until you do.</p>`
      : a.keys.left !== null && a.keys.left < LICENSE_KEYS_LOW
        ? `<p style="background:#fff7e6;border-radius:12px;padding:12px">
             <strong>${a.keys.left === 0 ? "That was your last license key." : `${a.keys.left} license ${a.keys.left === 1 ? "key" : "keys"} left.`}</strong><br/>
             ${a.keys.left === 0 ? "Nobody can buy it until you add more." : "When they run out, nobody can buy it until you add more."}
             Add keys from your <a href="${a.dashboardUrl}">dashboard</a>.</p>`
        : a.keys.left !== null
          ? `<p>License keys left: ${a.keys.left}</p>`
          : ""
    : "";
  return {
    subject: `You made a sale: ${a.title}`,
    html: emailShell(
      `<p>Someone just bought <strong>${escapeHtml(a.title)}</strong>. 🎉</p>
       ${keys}
       <p>Sale: ${money(a.amountCents)}<br/>
       Your share (after the ${Math.round(COMMISSION_RATE * 100)}% fee): <strong>${money(sellerCut)}</strong></p>
       <p style="color:#6b6b76;font-size:13px">Your share is transferred to your
       Stripe account now, and Stripe pays it out to your bank on your regular
       monthly schedule. Buyers have 14 days to request a refund; if one is
       refunded after your payout, we'll settle it against a later sale.
       Track your sales on your <a href="${a.dashboardUrl}">dashboard</a>.</p>`
    ),
  };
}

/** To the admin: a sale happened (so you see marketplace activity). */
export function saleAdminEmail(a: {
  title: string;
  buyerEmail: string;
  amountCents: number;
  /** True when the tool needs a key and none was left to give. */
  keyPending?: boolean;
  keysLeft?: number | null;
}) {
  return {
    subject: `${a.keyPending ? "ACTION: buyer has no license key. " : ""}New sale: ${a.title} (${money(a.amountCents)})`,
    html: emailShell(
      `<p>A sale just went through.</p>
       <p><strong>${escapeHtml(a.title)}</strong> — ${money(a.amountCents)}<br/>
       Buyer: ${escapeHtml(a.buyerEmail)}</p>
       ${a.keyPending ? `<p><strong>No license key was left for this buyer.</strong> The seller has been told. The buyer gets one automatically, by email and in their library, the moment the seller adds keys.</p>` : ""}
       ${typeof a.keysLeft === "number" ? `<p>License keys left: ${a.keysLeft}</p>` : ""}`
    ),
  };
}
