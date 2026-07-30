export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY diagnostic — which email/contact env vars does the running function
 * see, and which Vercel environment is it? No secret VALUES returned (only
 * presence + lengths, plus the non-secret EMAIL_FROM). Delete after debugging.
 */
export async function GET() {
  const url = process.env.CONTACT_WEBHOOK_URL ?? "";
  return Response.json({
    vercelEnv: process.env.VERCEL_ENV ?? null, // "production" | "preview" | "development"
    contactWebhookPresent: Boolean(url),
    contactWebhookLen: url.length,
    contactWebhookLooksRight: url.startsWith("https://script.google.com/"),
    resendKeyPresent: Boolean(process.env.RESEND_API_KEY),
    emailFrom: process.env.EMAIL_FROM ?? null,
    adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL ?? null,
  });
}
