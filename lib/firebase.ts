import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

/**
 * Firebase client init. Config comes from NEXT_PUBLIC_* env vars (see
 * .env.example). These values are public by design — access is controlled by
 * the Firestore security rules, not by hiding the config.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(firebaseConfig.projectId);

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// `ignoreUndefinedProperties` lets writes omit undefined fields (e.g. an empty
// optional website) instead of throwing "Unsupported field value: undefined".
// initializeFirestore must run before any getFirestore; fall back if it already
// started (e.g. across HMR reloads).
function initDb() {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    return getFirestore(app);
  }
}
export const db = initDb();

/**
 * Optional: Firebase App Check (reCAPTCHA v3) to deter bots and abuse of Auth,
 * Firestore and Storage. Runs only in the browser and only when a site key is
 * present, so local/dev without a key is unaffected. To enable: register the
 * site in Firebase console → App Check, then set NEXT_PUBLIC_RECAPTCHA_SITE_KEY.
 */
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  import("firebase/app-check")
    .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(
          process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string
        ),
        isTokenAutoRefreshEnabled: true,
      });
    })
    .catch((e) => console.error("[firebase] App Check init failed:", e));
}
