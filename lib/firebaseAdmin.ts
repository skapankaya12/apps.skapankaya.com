import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Firebase Admin SDK, for privileged server-side work: verifying the caller's
 * Firebase ID token, and writing `purchases` (which clients can't write per the
 * Firestore rules). Initialised lazily so `next build` doesn't fail when the
 * service-account env vars aren't present at build time.
 */

export const adminConfigured = Boolean(
  process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
);

function adminApp(): App {
  if (getApps().length) return getApp();
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Env stores the key with literal "\n"; turn them into real newlines.
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export function getAdminAuth() {
  return getAuth(adminApp());
}

export function getAdminDb() {
  return getFirestore(adminApp());
}

/**
 * Default Cloud Storage bucket, via the Admin SDK. Used to mint short-lived
 * signed download URLs for purchased packages (the Storage rules deny direct
 * client reads on the paid artifacts — see storage.rules). The bucket name
 * comes from the same public config the client uses.
 */
export function getAdminBucket() {
  return getStorage(adminApp()).bucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
}

/**
 * Verify the Firebase ID token from an Authorization: Bearer header and return
 * the caller's uid, or null if missing/invalid.
 */
export async function verifyRequestUid(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
