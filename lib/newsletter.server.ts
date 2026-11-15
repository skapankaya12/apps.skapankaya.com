import { createHash } from "node:crypto";
import { brand } from "@/lib/brand";
import { signLink } from "@/lib/emailLinks.server";
import { emailShell, escapeHtml } from "@/lib/email";

/**
 * The Thursday email: a weekly list of new finds, separate from the launch
 * list (which /privacy limits to one message) and from account email.
 *
 * Subscribers live in `newsletter/{id}`, where the id is a hash of the
 * address so the same person can never be added twice. There is no
 * firestore.rules entry for it, so no browser can read or write it; only
 * these routes, through the Admin SDK, can.
 *
 * Double opt-in, as on AI Standings: an address is `pending` until its owner
 * clicks the link in the confirmation email, and only `confirmed` addresses
 * will ever be sent the weekly email.
 */
export const NEWSLETTER = "newsletter";

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

export function subscriberId(email: string): string {
  return createHash("sha256").update(email).digest("hex").slice(0, 40);
}

export function confirmUrl(email: string, origin: string = brand.url): string {
  return `${origin}/api/newsletter/confirm?e=${encodeURIComponent(email)}&t=${signLink("newsletter-confirm", email)}`;
}

export function newsletterUnsubscribeUrl(email: string): string {
  return `${brand.url}/api/newsletter/unsubscribe?e=${encodeURIComponent(email)}&t=${signLink("newsletter-unsubscribe", email)}`;
}

export function confirmEmail(email: string): { subject: string; html: string; text: string } {
  const link = confirmUrl(email);
  const html = emailShell(`
    <p style="margin:0 0 14px;font-size:16px">one click and you're on the list.</p>
    <p style="margin:0 0 22px;color:#4a4a56">Every Thursday we send the new finds on ${escapeHtml(brand.name)}: tools you buy once, free tools, Grok Bots, agents and things worth reading. If you didn't ask for this, ignore this email and nothing happens.</p>
    <p style="margin:0 0 22px"><a href="${link}" style="display:inline-block;background:#8b1a1a;color:#fff;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:999px">Confirm my email</a></p>
    <p style="margin:0;color:#8a8a94;font-size:13px">Or paste this link into your browser:<br>${escapeHtml(link)}</p>
  `);
  const text = `One click and you're on the list.\n\nEvery Thursday we send the new finds on ${brand.name}. If you didn't ask for this, ignore this email.\n\nConfirm: ${link}`;
  return { subject: "confirm your thursday email", html, text };
}
