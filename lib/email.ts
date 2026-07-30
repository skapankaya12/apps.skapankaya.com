import { brand } from "@/lib/brand";

/**
 * Transactional email via Resend's REST API (no SDK dependency — same pattern as
 * the contact route). Server-only: never import this into a client component.
 *
 * Requires RESEND_API_KEY + EMAIL_FROM (see EMAIL_SETUP.md). If either is
 * missing we no-op and report it, so callers can treat email as best-effort and
 * never fail the user's action just because mail isn't configured yet.
 */

export const emailConfigured = Boolean(
  process.env.RESEND_API_KEY && process.env.EMAIL_FROM
);

/** Who gets admin notifications (new submissions). Overridable via env. */
export const adminNotifyEmail =
  process.env.ADMIN_NOTIFY_EMAIL || "kapankayasevval@gmail.com";

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  /** Optional plain-text fallback; Resend derives one if omitted. */
  text?: string;
  /** Set the Reply-To (e.g. a buyer's address on a support thread). */
  replyTo?: string;
};

/** Send one email. Returns true on success, false if unconfigured or failed. */
export async function sendEmail(args: SendArgs): Promise<boolean> {
  if (!emailConfigured) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: Array.isArray(args.to) ? args.to : [args.to],
        subject: args.subject,
        html: args.html,
        ...(args.text ? { text: args.text } : {}),
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend error:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send threw:", e);
    return false;
  }
}

/** Wrap body copy in a minimal, client-safe HTML shell with the brand name. */
export function emailShell(bodyHtml: string): string {
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#101014;line-height:1.5;max-width:520px">
    <p style="font-weight:800;font-size:18px;margin:0 0 16px">${brand.name}</p>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #ececef;margin:24px 0" />
    <p style="color:#6b6b76;font-size:12px;margin:0">The Solo Market · Buy it once. Own it forever.</p>
  </div>`;
}
