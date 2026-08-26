"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  runTransaction,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "./firebase";
import {
  DEFAULT_CATEGORIES,
  sortCategories,
  categoryLabel,
  toCategoryId,
  type Listing,
  type ListingStatus,
  type Purchase,
  type AppUser,
  type AdminUserList,
  type Role,
  type Category,
  type CategoryDef,
  REVIEW_CRITICAL_FIELDS,
} from "./types";
import { normalizeHandle, handleProblem } from "./handles";

/* ---------------------------------------------------------------------------
   Data store, backed by Firestore + Firebase Auth.

   Components still call synchronous getters (getApprovedListings(), getUser()…).
   Those read from in-memory caches that onSnapshot listeners keep live; every
   snapshot calls emit() so subscribed components re-render. Writes go straight
   to Firestore, and the listeners reflect them (optimistically, thanks to the
   SDK's local cache).

   Cart and bookmarks stay in localStorage: they're lightweight UI state and
   work for signed-out visitors without any rules.
--------------------------------------------------------------------------- */

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() {
  listeners.forEach((l) => l());
}
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/* ------------------------------ caches ------------------------------ */

let clientReady = false;
let currentUser: AppUser | null = null;
/** Whether the signed-in user's email is verified (from Firebase Auth, not the doc). */
let currentEmailVerified = false;
/** Sign-in providers on the current account, e.g. ["password"], ["google.com"]. */
let currentProviders: string[] = [];
/** True once the public approved-listings listener has responded at least once. */
let listingsLoaded = false;
let approvedListings: Listing[] = []; // public: every approved listing
let contextListings: Listing[] = []; // seller's own, or all listings for an admin
let purchases: Purchase[] = [];
/** The admin-managed browse filters. Empty until an admin has saved any. */
let categories: CategoryDef[] = [];

let unsubContext: Unsubscribe | undefined;
let unsubPurchases: Unsubscribe | undefined;
let unsubUserDoc: Unsubscribe | undefined;

function toListing(d: { id: string; data: () => unknown }): Listing {
  return { id: d.id, ...(d.data() as Omit<Listing, "id">) };
}

/** Approved + context listings, de-duped by id. */
function mergedListings(): Listing[] {
  const map = new Map<string, Listing>();
  for (const l of approvedListings) map.set(l.id, l);
  for (const l of contextListings) map.set(l.id, l);
  return [...map.values()];
}

/**
 * Set up the listeners that depend on who's signed in and their role.
 * Re-runs when the user doc changes (e.g. a buyer becomes a seller).
 */
function setupContextListeners() {
  unsubContext?.();
  unsubContext = undefined;
  if (!currentUser) {
    contextListings = [];
    return;
  }
  if (currentUser.role === "admin") {
    unsubContext = onSnapshot(collection(db, "listings"), (snap) => {
      contextListings = snap.docs.map(toListing);
      emit();
    });
  } else if (currentUser.role === "seller") {
    unsubContext = onSnapshot(
      query(collection(db, "listings"), where("sellerId", "==", currentUser.uid)),
      (snap) => {
        contextListings = snap.docs.map(toListing);
        emit();
      }
    );
  } else {
    contextListings = [];
  }
}

/** Call once on the client (from AppShell). Wires up Firestore + auth. */
export function markClientReady() {
  if (clientReady) return;
  clientReady = true;

  // Public listener: approved listings, readable by anyone per the rules.
  // Lives for the whole session, so we don't retain its unsubscribe.
  onSnapshot(
    query(collection(db, "listings"), where("status", "==", "approved")),
    (snap) => {
      approvedListings = snap.docs
        .map(toListing)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      listingsLoaded = true;
      emit();
    },
    (err) => {
      // Even on error we've "heard back": stop showing the loading state so the
      // UI can fall through to its empty/not-found view instead of hanging.
      listingsLoaded = true;
      console.error("[store] approved listings listener:", err.message);
      emit();
    }
  );

  // Public listener: the browse filters, world-readable like approved listings.
  // Also session-long — every page shows category labels somewhere.
  onSnapshot(
    collection(db, "categories"),
    (snap) => {
      categories = sortCategories(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CategoryDef, "id">),
        }))
      );
      emit();
    },
    (err) => {
      // Leaving `categories` empty falls back to DEFAULT_CATEGORIES, so browse
      // keeps its filters rather than losing them to a transient error.
      console.error("[store] categories listener:", err.message);
    }
  );

  onAuthStateChanged(auth, async (fbUser) => {
    // Tear down per-user listeners on any auth change.
    unsubContext?.();
    unsubPurchases?.();
    unsubUserDoc?.();
    unsubContext = unsubPurchases = unsubUserDoc = undefined;

    if (!fbUser) {
      currentUser = null;
      currentEmailVerified = false;
      currentProviders = [];
      contextListings = [];
      purchases = [];
      emit();
      return;
    }

    currentEmailVerified = fbUser.emailVerified;
    currentProviders = fbUser.providerData.map((p) => p.providerId);

    // Ensure a user doc exists (first sign-in creates it as a buyer). Prefer the
    // Auth displayName (set at signup); fall back to the email's local part.
    const uref = doc(db, "users", fbUser.uid);
    const existing = await getDoc(uref);
    if (!existing.exists()) {
      await setDoc(uref, {
        email: fbUser.email ?? "",
        displayName: fbUser.displayName || (fbUser.email ?? "user").split("@")[0],
        role: "buyer" as Role,
        createdAt: Date.now(),
      });
    }

    // Live user doc so role changes take effect immediately.
    unsubUserDoc = onSnapshot(uref, (s) => {
      currentUser = s.exists()
        ? { uid: s.id, ...(s.data() as Omit<AppUser, "uid">) }
        : null;
      setupContextListeners();
      emit();
    });

    // This buyer's purchases.
    unsubPurchases = onSnapshot(
      query(collection(db, "purchases"), where("buyerId", "==", fbUser.uid)),
      (snap) => {
        purchases = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Purchase, "id">),
        }));
        emit();
      },
      (err) => console.error("[store] purchases listener:", err.message)
    );
  });
}

/* ------------------------------ auth ------------------------------ */

export function getUser(): AppUser | null {
  return clientReady ? currentUser : null;
}

/** Whether the signed-in user has verified their email. False when signed out. */
export function isEmailVerified(): boolean {
  return clientReady ? currentEmailVerified : true;
}

/**
 * Whether this account can sign in with a password. Google-only accounts can't,
 * so the password and email panels in /account don't apply to them and
 * re-authentication has to go back through Google.
 */
export function hasPasswordSignIn(): boolean {
  return clientReady ? currentProviders.includes("password") : true;
}

/** A Google provider that always asks which account to use. */
function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // Without this, Google silently reuses whichever account the browser is
  // already signed into — surprising on a shared machine.
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/**
 * Sign in (or sign up — Google doesn't distinguish) with a Google account.
 *
 * Popup rather than redirect: browsers that partition third-party storage break
 * the redirect flow, and the popup is started from a click so it isn't blocked.
 * The user doc is created by the onAuthStateChanged handler above, using the
 * name Google gives us.
 */
export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider());
}

export async function signUp(email: string, password: string, displayName?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const name = displayName?.trim();
  if (name) await updateProfile(cred.user, { displayName: name });
  // Write the user doc now with the chosen name, so it doesn't get created with
  // the email-derived fallback by the auth listener that fires in parallel.
  await setDoc(
    doc(db, "users", cred.user.uid),
    {
      email: email.trim(),
      displayName: name || email.trim().split("@")[0],
      role: "buyer" as Role,
      createdAt: Date.now(),
    },
    { merge: true }
  );
  // Fire off the verification email (link-based; Firebase hosts the handler).
  await sendEmailVerification(cred.user);
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await signOut(auth);
}

/** Current user's Firebase ID token, for authenticating calls to our API routes. */
export async function getIdToken(): Promise<string | null> {
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}

/** Re-send the verification email to the current, still-unverified user. */
export async function resendVerification(): Promise<void> {
  if (auth.currentUser && !auth.currentUser.emailVerified) {
    await sendEmailVerification(auth.currentUser);
  }
}

/**
 * Re-check verification after the user clicks the link in their email. Firebase
 * caches emailVerified on the client, so we reload the user to pick up the change.
 */
export async function refreshEmailVerified(): Promise<boolean> {
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  currentEmailVerified = auth.currentUser.emailVerified;
  emit();
  return currentEmailVerified;
}

/** Send a password-reset email. Firebase hosts the reset page. */
export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/* ------------------------- account management ------------------------- */

/** Update the signed-in user's display name (Auth profile + user doc). */
export async function updateDisplayName(name: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("You're not signed in.");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name can't be empty.");
  await updateProfile(u, { displayName: trimmed });
  await updateDoc(doc(db, "users", u.uid), { displayName: trimmed });
}

/**
 * Re-authenticate the user with their current password. Firebase requires a
 * recent login before sensitive changes (password, email, delete); this proves
 * the person at the keyboard is the account owner. Maps common errors to
 * friendly messages.
 */
async function reauthenticate(currentPassword?: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("You're not signed in.");

  // Google-only account: there's no password to check, so prove it's them by
  // signing in through Google again.
  if (!currentProviders.includes("password")) {
    try {
      await reauthenticateWithPopup(u, googleProvider());
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        throw new Error("Google sign-in was closed before it finished.");
      }
      if (code === "auth/popup-blocked") {
        throw new Error("Your browser blocked the Google window. Allow popups and try again.");
      }
      if (code === "auth/user-mismatch") {
        throw new Error("That's a different Google account. Use the one you signed in with.");
      }
      throw new Error("Couldn't confirm it's you with Google. Please try again.");
    }
    return;
  }

  if (!u.email) throw new Error("You're not signed in.");
  if (!currentPassword) throw new Error("Enter your current password.");
  const cred = EmailAuthProvider.credential(u.email, currentPassword);
  try {
    await reauthenticateWithCredential(u, cred);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
      throw new Error("That current password isn't right.");
    }
    if (code === "auth/too-many-requests") {
      throw new Error("Too many attempts. Please wait a moment and try again.");
    }
    throw new Error("Couldn't verify your password. Please try again.");
  }
}

/** Change the password after re-authenticating with the current one. */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("You're not signed in.");
  if (!hasPasswordSignIn()) {
    throw new Error("Your password is managed by Google.");
  }
  if (newPassword.length < 6) throw new Error("Use at least 6 characters.");
  await reauthenticate(currentPassword);
  await updatePassword(u, newPassword);
}

/**
 * Start an email change. Firebase sends a verification link to the NEW address;
 * the change only takes effect once the user clicks it, so nobody can hijack an
 * account by typing a new email.
 */
export async function changeEmail(
  currentPassword: string,
  newEmail: string
): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("You're not signed in.");
  if (!hasPasswordSignIn()) {
    throw new Error("Your email address is managed by Google.");
  }
  const email = newEmail.trim();
  if (!email.includes("@")) throw new Error("Enter a valid email.");
  await reauthenticate(currentPassword);
  await verifyBeforeUpdateEmail(u, email);
}

/**
 * Permanently delete the account. Re-authenticates first, then the server (Admin
 * SDK) removes the user doc + auth account. Signs out afterwards.
 */
export async function deleteAccount(currentPassword?: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("You're not signed in.");
  await reauthenticate(currentPassword);
  const token = await u.getIdToken();
  const res = await fetch("/api/account/delete", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Couldn't delete your account. Please try again.");
  await signOut(auth);
}

/**
 * Change the signed-in user's role. The only legitimate self-service transition
 * is buyer → seller (the "become a seller" flow). "admin" is never self-assignable
 * here; admins are set manually via the console / Admin SDK. The Firestore rules
 * (firestore.rules) enforce this server-side — this guard is just defence in depth.
 */
export async function setRole(role: Role) {
  if (!currentUser) return;
  if (role === "admin") {
    throw new Error("Admin access can't be self-assigned.");
  }
  await updateDoc(doc(db, "users", currentUser.uid), { role });
}

/* ---------------------------------------------------------------------------
   Seller profile and handles.

   The profile is just fields on the user's own doc, so writing it is an
   ordinary update and the live user-doc listener re-renders whatever is on
   screen. The handle is the hard part: Firestore has no unique constraint on a
   field, so uniqueness is enforced by making the handle itself a document id in
   a separate `handles` collection and claiming it in a transaction.

   That collection is world-readable (see firestore.rules) for two reasons: the
   account page has to answer "is this taken?" before submitting, and /users is
   readable only by its owner, so nothing else could resolve a handle to a
   seller.
--------------------------------------------------------------------------- */

/** How long a seller must wait between handle changes. */
export const HANDLE_COOLDOWN_DAYS = 30;
const HANDLE_COOLDOWN_MS = HANDLE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * Whether a handle is free for the signed-in user to take.
 *
 * A handle they already own reads as available, so re-submitting the account
 * form without changing it is not an error.
 */
export async function isHandleAvailable(input: string): Promise<boolean> {
  const handle = normalizeHandle(input);
  if (handleProblem(handle)) return false;
  const snap = await getDoc(doc(db, "handles", handle));
  if (!snap.exists()) return true;
  return snap.data().uid === currentUser?.uid;
}

/**
 * Claim a handle for the signed-in user, releasing nothing.
 *
 * The previous handle is kept, pointed at the same uid, and marked inactive
 * rather than deleted. That is the whole point: a buyer who bookmarked
 * /seller/joana must never one day land on a different person's profile. An
 * inactive handle redirects to the seller's current one (see the route), and
 * only an admin can ever delete one.
 *
 * Throws with a message meant to be shown to the seller.
 */
export async function claimHandle(input: string): Promise<void> {
  if (!currentUser) throw new Error("Sign in first.");
  const uid = currentUser.uid;
  const handle = normalizeHandle(input);
  const problem = handleProblem(handle);
  if (problem) throw new Error(problem);

  try {
    await claimHandleTransaction(uid, handle);
  } catch (err) {
    // Only the messages written below are fit to show a seller. Everything else
    // is a Firestore failure, and its wording ("Missing or insufficient
    // permissions") means nothing to the person reading it.
    if (err instanceof HandleError) throw new Error(err.message);
    console.error("[claimHandle]", err);
    throw new Error("Couldn't save that handle. Please try again.");
  }
}

/** A refusal whose message is already written for the seller to read. */
class HandleError extends Error {}

async function claimHandleTransaction(uid: string, handle: string) {
  await runTransaction(db, async (tx) => {
    // Every read has to happen before every write inside a transaction.
    const userRef = doc(db, "users", uid);
    const userSnap = await tx.get(userRef);
    const previous: string | undefined = userSnap.data()?.handle;
    if (previous === handle) return; // Nothing to do; not an error.

    const targetRef = doc(db, "handles", handle);
    const targetSnap = await tx.get(targetRef);
    if (targetSnap.exists() && targetSnap.data().uid !== uid) {
      throw new HandleError("That handle is taken.");
    }

    // The cooldown only applies to a seller who already had a handle. Picking
    // one for the first time is never rate limited.
    const lastChange: number | undefined = userSnap.data()?.handleUpdatedAt;
    if (previous && lastChange) {
      const waited = Date.now() - lastChange;
      if (waited < HANDLE_COOLDOWN_MS) {
        const days = Math.ceil((HANDLE_COOLDOWN_MS - waited) / 86400000);
        throw new HandleError(
          `You can change your handle again in ${days} ${days === 1 ? "day" : "days"}.`
        );
      }
    }

    const now = Date.now();
    tx.set(
      targetRef,
      { uid, handle, active: true, createdAt: targetSnap.data()?.createdAt ?? now },
      { merge: true }
    );
    if (previous) {
      tx.set(doc(db, "handles", previous), { active: false }, { merge: true });
    }
    tx.update(userRef, { handle, handleUpdatedAt: now });
  });
}

/** The parts of a seller's public identity they edit themselves. */
export type SellerProfileEdit = {
  bio: string;
  supportEmail: string;
  website: string;
  avatarUrl?: string;
};

/**
 * Write the signed-in user's public profile.
 *
 * Empty strings are stored rather than deleted so a seller can clear a bio they
 * no longer want. `avatarUrl` is only touched when one was uploaded, so saving
 * the form without picking a new image keeps the current one.
 */
export async function saveSellerProfile(edit: SellerProfileEdit): Promise<void> {
  if (!currentUser) throw new Error("Sign in first.");
  const patch: Record<string, unknown> = {
    bio: edit.bio.trim(),
    supportEmail: edit.supportEmail.trim(),
    website: edit.website.trim(),
  };
  if (edit.avatarUrl) patch.avatarUrl = edit.avatarUrl;
  await updateDoc(doc(db, "users", currentUser.uid), patch);
}

/**
 * Whether this seller has filled in enough to list.
 *
 * A support email is the one field a buyer is promised, so the listing form
 * checks this before it will submit rather than collecting it again per tool.
 */
export function sellerProfileReady(user: AppUser | null): boolean {
  return Boolean(user?.supportEmail?.trim() && user?.handle);
}

/**
 * Ask the server to re-sync the seller's Stripe payout status onto their user
 * doc. The live user-doc listener then updates the dashboard badge on its own,
 * so this returns nothing. Silently no-ops if signed out or Stripe isn't wired.
 */
export async function refreshPayoutStatus(): Promise<void> {
  const token = await getIdToken();
  if (!token) return;
  await fetch("/api/stripe/status", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

/**
 * Best-effort: tell the server a listing was just submitted so it can email the
 * admin. Never throws — a failed notification must not break the submit flow.
 */
export async function notifyListingSubmitted(listingId: string): Promise<void> {
  const token = await getIdToken();
  if (!token) return;
  await fetch("/api/notify/listing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ listingId }),
  }).catch(() => {});
}

/**
 * Best-effort: tell the server an admin approved/rejected a listing so it can
 * email the seller (with the review note). Never throws.
 */
export async function notifyReviewDecision(
  listingId: string,
  decision: "approved" | "rejected",
  note: string
): Promise<void> {
  const token = await getIdToken();
  if (!token) return;
  await fetch("/api/notify/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ listingId, decision, note }),
  }).catch(() => {});
}

/**
 * Registered-user count for the admin console. Firestore holds every account in
 * `users`, but counting them client-side would mean downloading all of them, so
 * the server answers with an aggregation query. Returns null when the caller
 * isn't an admin or the request fails, and the console shows a placeholder.
 */
export async function fetchUserCount(): Promise<number | null> {
  const token = await getIdToken();
  try {
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { userCount?: number };
    return typeof data.userCount === "number" ? data.userCount : null;
  } catch {
    return null;
  }
}

/**
 * Registered accounts, newest first, for the admin console's users panel.
 * Admin-only on the server. Returns null rather than throwing when the call
 * fails, and the panel says so. `total` can exceed `users.length` once the
 * collection outgrows the server's cap.
 */
export async function fetchUsers(): Promise<AdminUserList | null> {
  const token = await getIdToken();
  try {
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<AdminUserList>;
    const users = data.users ?? [];
    return {
      users,
      total: data.total ?? users.length,
      counts: data.counts ?? { buyer: 0, seller: 0, admin: 0 },
    };
  } catch {
    return null;
  }
}

/* ------------------------------ listings ------------------------------ */

export function getApprovedListings(): Listing[] {
  return approvedListings;
}

/** False until the listings listener has responded once; drives loading UI. */
export function getListingsLoaded(): boolean {
  return clientReady ? listingsLoaded : false;
}

export function getListings(opts?: {
  status?: ListingStatus;
  sellerId?: string;
}): Listing[] {
  let items = mergedListings();
  if (opts?.status) items = items.filter((l) => l.status === opts.status);
  if (opts?.sellerId) items = items.filter((l) => l.sellerId === opts.sellerId);
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getListingBySlug(slug: string): Listing | undefined {
  return mergedListings().find((l) => l.slug === slug);
}

export function getListingById(id: string): Listing | undefined {
  return mergedListings().find((l) => l.id === id);
}

/**
 * Title → URL slug. Capped at 60 characters and trimmed at a word boundary:
 * short, readable URLs are what Google's own guidance asks for, and an
 * uncapped slug from a title that's really a paragraph produces a path long
 * enough to break the filesystem at build time (it has).
 */
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= 60) return base;
  const cut = base.slice(0, 60);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/, "");
}

/**
 * Reserve a listing id without writing anything yet. The seller form uploads the
 * package/screenshots/demo under this id first (Storage paths are keyed by it),
 * then calls createListing(id, …) so the doc is created already pointing at its
 * media — no empty-then-patch window.
 */
export function reserveListingId(): string {
  return doc(collection(db, "listings")).id;
}

export async function createListing(
  id: string,
  input: Omit<
    Listing,
    "id" | "slug" | "status" | "salesCount" | "createdAt" | "updatedAt"
  >
): Promise<void> {
  const now = Date.now();
  const slug = `${slugify(input.title)}-${now.toString().slice(-5)}`;
  await setDoc(doc(db, "listings", id), {
    ...input,
    slug,
    status: "pending" as ListingStatus, // every submission enters the review queue
    salesCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Ask the server for a short-lived signed URL to download a listing's package.
 * The route (app/api/download) verifies the caller owns a purchase (or is the
 * seller/an admin) before minting the URL. Throws on any failure.
 */
export async function requestDownload(listingId: string): Promise<string> {
  const token = await getIdToken();
  if (!token) throw new Error("Please sign in to download.");
  const res = await fetch("/api/download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ listingId }),
  });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      error === "no-package"
        ? "This package isn't available for download yet."
        : error === "unavailable"
          ? "This tool is no longer available for download. If you bought it, contact us about a refund."
          : error === "forbidden"
            ? "You don't have access to this download."
            : "Couldn't start the download. Please try again."
    );
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

/**
 * Update a seller's own listing and send it back to review. Used by the
 * edit-and-resubmit flow for rejected (or pending) listings: it overwrites the
 * editable fields, resets status to "pending", and clears the old review note.
 * The Firestore rules allow this only while the listing is pending/rejected.
 */
export type ListingEdit = Omit<
  Listing,
  "id" | "slug" | "status" | "salesCount" | "createdAt" | "updatedAt" | "reviewNote"
>;

/** Just the fields that decide whether an edit needs reviewing again. */
export type ReviewCriticalParts = Pick<
  Listing,
  (typeof REVIEW_CRITICAL_FIELDS)[number]
>;

/**
 * Whether this edit has to go back through review.
 *
 * Narrow on purpose: the seller form calls this while the seller is still
 * typing, before anything has been uploaded, so it must not need a finished
 * edit to answer. A full ListingEdit satisfies it too.
 *
 * The answer is not enforced here. firestore.rules decides, reading the same
 * list of fields. This exists so the seller is told which of the two things
 * Save is about to do before they press it.
 */
export function requiresReReview(
  current: Listing,
  next: ReviewCriticalParts
): boolean {
  return REVIEW_CRITICAL_FIELDS.some(
    // Normalised because an absent optional field and an explicit undefined are
    // the same thing to a seller, and platform is absent on older listings.
    (field) => (current[field] ?? null) !== (next[field] ?? null)
  );
}

/**
 * Save a seller's edit, and answer with the status the listing ended up in.
 *
 * This used to force every edit back to `pending` unconditionally, which meant
 * correcting a typo took a live, selling tool off the marketplace until someone
 * reviewed the correction. Now a presentation change keeps the listing exactly
 * where it was, and only a change to what the buyer receives returns it to the
 * queue.
 *
 * `current` is required rather than re-read here: the caller is editing a
 * listing it already holds, and passing it makes every call site state which
 * listing it believes it is changing.
 */
export async function updateListing(
  id: string,
  input: ListingEdit,
  current: Listing
): Promise<ListingStatus> {
  const reviewed = current.status === "approved" || current.status === "unlisted";
  const staysPut = reviewed && !requiresReReview(current, input);
  const status: ListingStatus = staysPut ? current.status : "pending";

  await updateDoc(doc(db, "listings", id), {
    ...input,
    status,
    updatedAt: Date.now(),
    // Only worth clearing when the listing is re-entering the queue: on an
    // in-place edit the note is whatever the last review said, and wiping it
    // would quietly discard an admin's approval note.
    ...(staysPut ? {} : { reviewNote: "" }),
  });
  return status;
}

/**
 * Take a live listing off sale, or put it back.
 *
 * Deliberately its own write that touches nothing but the status, which is what
 * firestore.rules requires: a visibility switch must not be a way to smuggle an
 * edit past review. Relisting needs no new review because nothing about the
 * reviewed package changed.
 *
 * Buyers who already own it keep downloading it either way. See the unlisted
 * branch in app/api/download.
 */
export async function setListingOnSale(
  id: string,
  onSale: boolean
): Promise<void> {
  await updateDoc(doc(db, "listings", id), {
    status: (onSale ? "approved" : "unlisted") satisfies ListingStatus,
    updatedAt: Date.now(),
  });
}

/** What an admin is allowed to rewrite on someone else's listing. */
export type AdminListingEdit = Pick<
  Listing,
  | "title"
  | "tagline"
  | "description"
  | "category"
  | "runtime"
  | "setupMode"
  | "priceCents"
  | "version"
  | "screenshots"
  | "sellerBio"
  | "sellerEmail"
  | "sellerWebsite"
> & { demoVideo?: string; posterImage?: string };

/**
 * Edit a listing as an admin: fix a typo, re-file it, replace a demo video the
 * browser can't play.
 *
 * Deliberately not `updateListing`. That one resets status to "pending" and
 * clears the review note, which is right for a seller resubmitting — but an
 * admin correcting a live listing would be pulling the tool off the marketplace
 * as a side effect of fixing its tagline. Status and reviewNote are left
 * exactly as they were, same reasoning as setListingCategory below.
 *
 * Three fields are absent on purpose, and it matters:
 *   - `sellerId` / `sellerName`, because the checkout route resolves the payout
 *     account from sellerId. Rewriting it while saving would silently redirect
 *     the seller's earnings to whoever did the edit.
 *   - `packagePath`, because the download route only mints URLs for a package
 *     sitting under the seller's own uid folder (see app/api/download). An
 *     admin-uploaded replacement would land under the admin's uid and break
 *     downloads for every buyer. Swapping the product itself stays the
 *     seller's job.
 *
 * The Firestore rules are the real gate — an admin may update any listing — so
 * a non-admin calling this is refused by the server, not merely hidden from.
 */
export async function adminUpdateListing(
  id: string,
  input: AdminListingEdit
): Promise<void> {
  await updateDoc(doc(db, "listings", id), {
    ...input,
    updatedAt: Date.now(),
  });
}

export async function reviewListing(
  id: string,
  decision: "approved" | "rejected",
  reviewNote: string
): Promise<void> {
  await updateDoc(doc(db, "listings", id), {
    status: decision,
    reviewNote,
    updatedAt: Date.now(),
  });
}

/**
 * Re-file a listing under a different category — which is what decides the
 * browse filter it shows up under.
 *
 * Sellers pick their own category at submission and often pick wrong, so an
 * admin needs to correct it after the fact. Deliberately NOT `updateListing`:
 * that resets status to 'pending', which would pull a live tool off the
 * marketplace just to change which chip it files under. This touches the
 * category and nothing else.
 *
 * Admin-only in practice. The Firestore rules are the real gate — an admin may
 * update any listing, a seller only their own and only while it's pending or
 * rejected — so a non-admin calling this is rejected by the server, not just
 * hidden from in the UI.
 */
export async function setListingCategory(
  id: string,
  category: Category
): Promise<void> {
  await updateDoc(doc(db, "listings", id), {
    category,
    updatedAt: Date.now(),
  });
}

/* ------------------------------ categories ------------------------------ */

/**
 * The browse filters, in chip order.
 *
 * Falls back to DEFAULT_CATEGORIES until the collection has documents — which
 * is also what the server renders, so the chips don't change shape between the
 * HTML and hydration on a database nobody has customised yet.
 */
export function getCategories(): CategoryDef[] {
  if (!clientReady || categories.length === 0) return DEFAULT_CATEGORIES;
  return categories;
}

/** Display label for a listing's category id. Never empty — see categoryLabel. */
export function getCategoryLabel(id: Category): string {
  return categoryLabel(id, getCategories());
}

/** How many listings (of every status the caller can see) sit in a category. */
export function countListingsInCategory(id: Category): number {
  return mergedListings().filter((l) => l.category === id).length;
}

/**
 * Materialise DEFAULT_CATEGORIES into Firestore the first time an admin edits
 * the filters. Until then the defaults are code, not data, so renaming or
 * deleting one has nothing to write to — this makes them real documents in a
 * single batch, and every later edit is an ordinary write.
 */
async function ensureCategoriesSeeded(): Promise<void> {
  const snap = await getDocs(collection(db, "categories"));
  if (!snap.empty) return;
  const now = Date.now();
  const batch = writeBatch(db);
  for (const c of DEFAULT_CATEGORIES) {
    const { id, ...rest } = c;
    batch.set(doc(db, "categories", id), {
      ...rest,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
}

/**
 * Add a browse filter. The id is slugified from the label, because it's what
 * gets stored on every listing filed under it and what an admin reads in the
 * console — a slug survives a later rename, a random doc id wouldn't mean
 * anything. Returns the new id.
 *
 * Admin-only; the Firestore rules are the real gate.
 */
export async function createCategory(
  label: string,
  hint: string
): Promise<string> {
  const name = label.trim();
  if (!name) throw new Error("Give the filter a name.");
  const id = toCategoryId(name);
  if (!id) throw new Error("That name has no letters or numbers in it.");

  await ensureCategoriesSeeded();
  const ref = doc(db, "categories", id);
  if ((await getDoc(ref)).exists()) {
    throw new Error(`“${name}” already exists as a filter.`);
  }

  const now = Date.now();
  // New filters go last, so adding one never reshuffles the chips buyers know.
  const order =
    getCategories().reduce((max, c) => Math.max(max, c.order), -1) + 1;
  await setDoc(ref, {
    label: name,
    hint: hint.trim(),
    order,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/**
 * Rename a filter or reword its hint. The id stays put, so listings already
 * filed under it follow the new name without a single listing being touched.
 */
export async function updateCategory(
  id: Category,
  patch: { label?: string; hint?: string }
): Promise<void> {
  const label = patch.label?.trim();
  if (patch.label !== undefined && !label) {
    throw new Error("Give the filter a name.");
  }
  await ensureCategoriesSeeded();
  await setDoc(
    doc(db, "categories", id),
    {
      ...(label !== undefined ? { label } : {}),
      ...(patch.hint !== undefined ? { hint: patch.hint.trim() } : {}),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/**
 * Move a filter one place along the chip row. Swaps `order` with its
 * neighbour rather than renumbering everything, so two admins reordering at
 * once can only disagree about one pair.
 */
export async function moveCategory(
  id: Category,
  direction: -1 | 1
): Promise<void> {
  await ensureCategoriesSeeded();
  const list = getCategories();
  const i = list.findIndex((c) => c.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return;

  const now = Date.now();
  const batch = writeBatch(db);
  batch.set(
    doc(db, "categories", list[i].id),
    { order: list[j].order, updatedAt: now },
    { merge: true }
  );
  batch.set(
    doc(db, "categories", list[j].id),
    { order: list[i].order, updatedAt: now },
    { merge: true }
  );
  await batch.commit();
}

/**
 * Remove a filter.
 *
 * A listing stores its category as a plain id, so deleting one out from under
 * live tools would strand them: they'd stay on sale but sit under no chip,
 * findable only by search. So this refuses unless the category is empty or the
 * admin says where its tools should go — and re-files them in the same
 * operation. Status is untouched: re-filing must never unpublish anything.
 */
export async function deleteCategory(
  id: Category,
  reassignTo?: Category
): Promise<void> {
  if (getCategories().length <= 1) {
    throw new Error("Keep at least one filter — browse needs somewhere to file tools.");
  }
  if (reassignTo === id) {
    throw new Error("Pick a different filter to move the tools to.");
  }

  const affected = mergedListings().filter((l) => l.category === id);
  if (affected.length > 0 && !reassignTo) {
    throw new Error(
      `${affected.length} ${affected.length === 1 ? "tool is" : "tools are"} filed under this filter. Choose where to move them first.`
    );
  }

  await ensureCategoriesSeeded();
  if (affected.length > 0) {
    const now = Date.now();
    const batch = writeBatch(db);
    for (const l of affected) {
      batch.update(doc(db, "listings", l.id), {
        category: reassignTo,
        updatedAt: now,
      });
    }
    await batch.commit();
  }
  await deleteDoc(doc(db, "categories", id));
}

/* ------------------------------ purchases ------------------------------ */

export function getPurchases(buyerId: string): Purchase[] {
  return purchases
    .filter((p) => p.buyerId === buyerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function hasPurchased(buyerId: string, listingId: string): boolean {
  return purchases.some((p) => p.buyerId === buyerId && p.listingId === listingId);
}

/**
 * Purchases are written server-side by the Stripe webhook (the rules forbid
 * client writes). Until Stripe is wired, the buy flow shows a "coming soon"
 * state, so there is intentionally no client-side purchase write here.
 */
export const purchasesEnabled = false;

/* ------------------------------ cart (localStorage) ------------------------------ */

const CART_KEY = "am_cart";
const BOOKMARKS_KEY = "am_bookmarks";

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !clientReady) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  emit();
}

export function getCart(): string[] {
  return readLocal<string[]>(CART_KEY, []);
}
export function getCartListings(): Listing[] {
  const ids = new Set(getCart());
  return mergedListings().filter((l) => ids.has(l.id));
}
export function isInCart(listingId: string): boolean {
  return getCart().includes(listingId);
}
export function addToCart(listingId: string) {
  const cart = getCart();
  if (!cart.includes(listingId)) writeLocal(CART_KEY, [...cart, listingId]);
}
export function removeFromCart(listingId: string) {
  writeLocal(CART_KEY, getCart().filter((id) => id !== listingId));
}
export function clearCart() {
  writeLocal(CART_KEY, []);
}

/* ------------------------------ bookmarks (localStorage) ------------------------------ */

export function getBookmarks(): string[] {
  return readLocal<string[]>(BOOKMARKS_KEY, []);
}
export function getBookmarkedListings(): Listing[] {
  const ids = new Set(getBookmarks());
  return mergedListings().filter((l) => ids.has(l.id));
}
export function isBookmarked(listingId: string): boolean {
  return getBookmarks().includes(listingId);
}
export function toggleBookmark(listingId: string) {
  const saved = getBookmarks();
  writeLocal(
    BOOKMARKS_KEY,
    saved.includes(listingId)
      ? saved.filter((id) => id !== listingId)
      : [...saved, listingId]
  );
}

/* ------------------------------ helpers ------------------------------ */

export function formatPrice(cents: number, symbol = "$"): string {
  return `${symbol}${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}
