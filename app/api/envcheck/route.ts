export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY diagnostic — reports which env vars the running function can see and
 * which Vercel environment it's in. No secret VALUES are returned, only presence
 * booleans + lengths. Delete after debugging the "not-configured" 501.
 */
export async function GET() {
  return Response.json({
    vercelEnv: process.env.VERCEL_ENV ?? null, // "production" | "preview" | "development"
    adminProjectId: Boolean(process.env.FIREBASE_ADMIN_PROJECT_ID),
    adminClientEmail: Boolean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
    adminPrivateKey: Boolean(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    privateKeyLen: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length ?? 0,
    stripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
    webhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null,
  });
}
