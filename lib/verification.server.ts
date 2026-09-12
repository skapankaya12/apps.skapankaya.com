import { getAdminAuth } from "@/lib/firebaseAdmin";

/**
 * An email-verification link, made by Firebase but sent by us. Server-only.
 *
 * Firebase's own verification email cannot be designed (its body is locked in
 * the console), so the site asks the Admin SDK for the link alone and puts it
 * into its own email: the welcome for sellers, the verification email for
 * everyone else. The link, the code in it and the check behind it are still
 * Firebase's, exactly as when Firebase sent the mail itself.
 *
 * `continueUrl` is where Firebase's "email verified" page sends them next. It
 * must be on a domain listed under Authentication, Authorized domains; if it
 * is not, Firebase refuses to make the link, so this retries without one
 * rather than leave somebody with no way to verify.
 */
export async function emailVerificationLink(email: string, continueUrl?: string): Promise<string> {
  const auth = getAdminAuth();
  if (continueUrl) {
    try {
      return await auth.generateEmailVerificationLink(email, { url: continueUrl });
    } catch (err) {
      console.error("[verification] continue URL refused, sending without it:", err);
    }
  }
  return auth.generateEmailVerificationLink(email);
}
