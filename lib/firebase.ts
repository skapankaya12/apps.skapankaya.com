/**
 * Firebase client init — inert until you add config to .env.local.
 *
 * The app currently runs entirely on the localStorage store (lib/store.ts) so
 * every flow is demoable with no backend. When you're ready to go live:
 *   1. npm install firebase
 *   2. Fill .env.local from .env.example (values from Firebase console)
 *   3. Uncomment the block below
 *   4. Replace the read/write helpers in lib/store.ts with Firestore calls
 *      (see FIREBASE_SETUP.md for the exact mapping)
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.projectId);

/*
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
*/
