import { emailShell, escapeHtml } from "@/lib/email";
import { COMMISSION_RATE } from "@/lib/stripe";
import { brand } from "@/lib/brand";
import { SELLER_WELCOME_HTML } from "@/lib/emails/sellerWelcome";
import { SELLER_NO_LISTING_HTML } from "@/lib/emails/sellerNoListing";
import { SELLER_REJECTED_HTML } from "@/lib/emails/sellerRejected";
import { SELLER_APPROVED_HTML } from "@/lib/emails/sellerApproved";
import { noteToEmailHtml } from "@/lib/noteEmail";

/* ---------------------------------------------------------------------------
   All transactional email copy lives here — one place to edit the wording.
   Each function returns { subject, html }. User-supplied text (titles, notes)
   is escaped; URLs are built by the caller from the request origin.
--------------------------------------------------------------------------- */

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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

export function sellerWelcomeEmail(imageBase = `${brand.url}/email/`) {
  return {
    subject: "guess what? happy to have you!",
    html: SELLER_WELCOME_HTML.replaceAll("{{IMG}}", imageBase),
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

/** To the buyer: purchase receipt + how to download + the 14-day guarantee. */
export function purchaseReceiptBuyerEmail(a: {
  title: string;
  amountCents: number;
  libraryUrl: string;
}) {
  return {
    subject: `Your receipt for ${a.title}`,
    html: emailShell(
      `<p>Thanks for your purchase! Here's your receipt.</p>
       <p><strong>${escapeHtml(a.title)}</strong><br/>
       Paid: ${money(a.amountCents)}</p>
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
}) {
  const sellerCut = Math.round(a.amountCents * (1 - COMMISSION_RATE));
  return {
    subject: `You made a sale: ${a.title}`,
    html: emailShell(
      `<p>Someone just bought <strong>${escapeHtml(a.title)}</strong>. 🎉</p>
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
}) {
  return {
    subject: `New sale: ${a.title} (${money(a.amountCents)})`,
    html: emailShell(
      `<p>A sale just went through.</p>
       <p><strong>${escapeHtml(a.title)}</strong> — ${money(a.amountCents)}<br/>
       Buyer: ${escapeHtml(a.buyerEmail)}</p>`
    ),
  };
}
