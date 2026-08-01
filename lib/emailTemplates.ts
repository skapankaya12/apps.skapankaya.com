import { emailShell, escapeHtml } from "@/lib/email";
import { COMMISSION_RATE } from "@/lib/stripe";

/* ---------------------------------------------------------------------------
   All transactional email copy lives here — one place to edit the wording.
   Each function returns { subject, html }. User-supplied text (titles, notes)
   is escaped; URLs are built by the caller from the request origin.
--------------------------------------------------------------------------- */

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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

/** To the seller: their listing was approved or rejected (with the review note). */
export function reviewDecisionSellerEmail(a: {
  decision: "approved" | "rejected";
  title: string;
  note?: string;
  listingUrl: string;
  dashboardUrl: string;
}) {
  const noteHtml = a.note?.trim()
    ? `<p style="background:#f7f7f8;border-radius:12px;padding:12px"><strong>Note from review:</strong><br/>${escapeHtml(a.note.trim())}</p>`
    : "";
  const title = escapeHtml(a.title);
  if (a.decision === "approved") {
    return {
      subject: `Approved: ${a.title} is live`,
      html: emailShell(
        `<p><strong>${title}</strong> passed review and is now live on the marketplace. 🎉</p>
         ${noteHtml}
         <p><a href="${a.listingUrl}">View your listing →</a></p>`
      ),
    };
  }
  return {
    subject: `Update on your listing: ${a.title}`,
    html: emailShell(
      `<p><strong>${title}</strong> wasn't approved this time.</p>
       ${noteHtml}
       <p>You can edit it and resubmit from your <a href="${a.dashboardUrl}">dashboard</a>.</p>`
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
