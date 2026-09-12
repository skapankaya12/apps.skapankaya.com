import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { brand } from "@/lib/brand";

/**
 * Signed links inside emails. Server-only.
 *
 * An unsubscribe link carries the account's uid and a signature over it, so
 * nobody can unsubscribe somebody else by editing the uid in the URL, and the
 * link needs no login, which is the point of it.
 *
 * The key is EMAIL_LINK_SECRET when set, otherwise derived from the Firebase
 * Admin private key, which every environment that sends mail already has. A
 * derived key means one fewer secret to manage; the cost is that rotating the
 * Admin key invalidates links in old emails, which then fail as "expired"
 * rather than doing anything wrong.
 */
function key(): string {
  const explicit = process.env.EMAIL_LINK_SECRET;
  if (explicit) return explicit;
  const admin = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!admin) throw new Error("EMAIL_LINK_SECRET or FIREBASE_ADMIN_PRIVATE_KEY must be set");
  return createHash("sha256").update(`email-links:${admin}`).digest("hex");
}

function sign(uid: string): string {
  return createHmac("sha256", key()).update(`unsubscribe:${uid}`).digest("base64url").slice(0, 32);
}

export function unsubscribeUrl(uid: string): string {
  return `${brand.url}/api/email/unsubscribe?u=${encodeURIComponent(uid)}&t=${sign(uid)}`;
}

export function verifyUnsubscribe(uid: string, token: string): boolean {
  if (!uid || !token) return false;
  const expected = Buffer.from(sign(uid));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
