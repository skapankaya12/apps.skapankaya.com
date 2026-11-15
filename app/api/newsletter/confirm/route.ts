import { FieldValue } from "firebase-admin/firestore";
import { adminConfigured, getAdminDb } from "@/lib/firebaseAdmin";
import { verifyLink } from "@/lib/emailLinks.server";
import { NEWSLETTER, normaliseEmail, subscriberId } from "@/lib/newsletter.server";

export const runtime = "nodejs";

/**
 * The link in the confirmation email. A valid, signed link turns a pending
 * address into a confirmed one and lands on the homepage with
 * ?newsletter=confirmed; anything else lands with ?newsletter=invalid.
 * Confirming twice is harmless.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = normaliseEmail(url.searchParams.get("e"));
  const token = url.searchParams.get("t") ?? "";
  const home = (state: string) => Response.redirect(`${url.origin}/?newsletter=${state}`, 303);

  if (!email || !verifyLink("newsletter-confirm", email, token)) return home("invalid");
  if (!adminConfigured) return home("later");

  const ref = getAdminDb().collection(NEWSLETTER).doc(subscriberId(email));
  const snap = await ref.get();
  if (!snap.exists) return home("invalid");
  if (snap.get("status") !== "confirmed") {
    await ref.set({ status: "confirmed", confirmedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  return home("confirmed");
}
