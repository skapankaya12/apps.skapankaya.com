"use client";

import type { Listing, ListingStatus, Purchase, AppUser, Role } from "./types";
import { seedListings, seedPurchases, seedUsers } from "./seed";

/* ---------------------------------------------------------------------------
   Client-side data store.

   Today: persists to localStorage so every buyer/seller/admin flow works with
   zero backend keys. Each exported function maps 1:1 to a Firestore call, so
   swapping to Firebase later is a mechanical change inside this one file
   (see FIREBASE_SETUP.md for the exact replacements).
--------------------------------------------------------------------------- */

const KEYS = {
  listings: "rl_listings",
  purchases: "rl_purchases",
  user: "rl_user",
  cart: "rl_cart",
  bookmarks: "rl_bookmarks",
  // Bump this whenever seed.ts content changes, so existing browsers reseed.
  seeded: "am_seeded_v7",
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * Hydration gate. Until the client mounts and flips this on, every read returns
 * its fallback, so the server HTML and the first client render agree (no
 * hydration mismatch), even when localStorage already holds data. After mount,
 * markClientReady() bumps the version and the tree re-renders with live data.
 */
let clientReady = false;
export function markClientReady() {
  if (clientReady) return;
  clientReady = true;
  emit();
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !clientReady) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  emit();
}

/** Seed once per browser. Idempotent. */
export function ensureSeeded() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(KEYS.seeded)) return;
  write(KEYS.listings, seedListings);
  write(KEYS.purchases, seedPurchases);
  window.localStorage.setItem(KEYS.seeded, "1");
}

/* ----------------------------- Auth (demo) ----------------------------- */

export function getUser(): AppUser | null {
  return read<AppUser | null>(KEYS.user, null);
}

export function login(email: string): AppUser {
  const existing = seedUsers.find((u) => u.email === email);
  const user: AppUser =
    existing ?? {
      uid: "u_" + Math.random().toString(36).slice(2, 9),
      email,
      displayName: email.split("@")[0],
      role: "buyer",
      createdAt: Date.now(),
    };
  write(KEYS.user, user);
  return user;
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEYS.user);
  emit();
}

/** Demo helper: switch the signed-in user's role to preview each view. */
export function setRole(role: Role) {
  const user = getUser();
  if (!user) return;
  write(KEYS.user, { ...user, role });
}

/* ----------------------------- Listings ----------------------------- */

export function getListings(opts?: {
  status?: ListingStatus;
  sellerId?: string;
}): Listing[] {
  let items = read<Listing[]>(KEYS.listings, []);
  if (opts?.status) items = items.filter((l) => l.status === opts.status);
  if (opts?.sellerId) items = items.filter((l) => l.sellerId === opts.sellerId);
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getApprovedListings(): Listing[] {
  return getListings({ status: "approved" });
}

export function getListingBySlug(slug: string): Listing | undefined {
  return read<Listing[]>(KEYS.listings, []).find((l) => l.slug === slug);
}

export function getListingById(id: string): Listing | undefined {
  return read<Listing[]>(KEYS.listings, []).find((l) => l.id === id);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createListing(
  input: Omit<
    Listing,
    "id" | "slug" | "status" | "salesCount" | "createdAt" | "updatedAt"
  >
): Listing {
  const items = read<Listing[]>(KEYS.listings, []);
  const now = Date.now();
  let slug = slugify(input.title);
  if (items.some((l) => l.slug === slug)) slug = `${slug}-${now.toString().slice(-4)}`;
  const listing: Listing = {
    ...input,
    id: "l_" + Math.random().toString(36).slice(2, 9),
    slug,
    status: "pending", // every new submission enters the review queue
    salesCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  write(KEYS.listings, [listing, ...items]);
  return listing;
}

export function reviewListing(
  id: string,
  decision: "approved" | "rejected",
  reviewNote: string
) {
  const items = read<Listing[]>(KEYS.listings, []);
  const next = items.map((l) =>
    l.id === id
      ? { ...l, status: decision as ListingStatus, reviewNote, updatedAt: Date.now() }
      : l
  );
  write(KEYS.listings, next);
}

/* ----------------------------- Purchases ----------------------------- */

export function getPurchases(buyerId: string): Purchase[] {
  return read<Purchase[]>(KEYS.purchases, [])
    .filter((p) => p.buyerId === buyerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function hasPurchased(buyerId: string, listingId: string): boolean {
  return read<Purchase[]>(KEYS.purchases, []).some(
    (p) => p.buyerId === buyerId && p.listingId === listingId
  );
}

/**
 * Records a purchase. In production this is written by a Stripe webhook after
 * checkout.session.completed, never trusted from the client. Here it stands in
 * for that server step so the buy flow is demoable end to end.
 */
export function recordPurchase(buyer: AppUser, listing: Listing): Purchase {
  const purchases = read<Purchase[]>(KEYS.purchases, []);
  const purchase: Purchase = {
    id: "p_" + Math.random().toString(36).slice(2, 9),
    buyerId: buyer.uid,
    listingId: listing.id,
    listingSlug: listing.slug,
    listingTitle: listing.title,
    sellerName: listing.sellerName,
    amountCents: listing.priceCents,
    purchasedVersion: listing.version,
    createdAt: Date.now(),
  };
  write(KEYS.purchases, [purchase, ...purchases]);

  // Increment the listing's sales counter (webhook does this server-side too).
  const listings = read<Listing[]>(KEYS.listings, []);
  write(
    KEYS.listings,
    listings.map((l) =>
      l.id === listing.id ? { ...l, salesCount: l.salesCount + 1 } : l
    )
  );
  return purchase;
}

/* ----------------------------- Cart ----------------------------- */
/* Stored as an array of listing ids. Demo-global; in prod, scope per user. */

export function getCart(): string[] {
  return read<string[]>(KEYS.cart, []);
}

export function getCartListings(): Listing[] {
  const ids = new Set(getCart());
  return read<Listing[]>(KEYS.listings, []).filter((l) => ids.has(l.id));
}

export function isInCart(listingId: string): boolean {
  return getCart().includes(listingId);
}

export function addToCart(listingId: string) {
  const cart = getCart();
  if (!cart.includes(listingId)) write(KEYS.cart, [...cart, listingId]);
}

export function removeFromCart(listingId: string) {
  write(KEYS.cart, getCart().filter((id) => id !== listingId));
}

export function clearCart() {
  write(KEYS.cart, []);
}

/* ----------------------------- Bookmarks (saved) ----------------------------- */

export function getBookmarks(): string[] {
  return read<string[]>(KEYS.bookmarks, []);
}

export function getBookmarkedListings(): Listing[] {
  const ids = new Set(getBookmarks());
  return read<Listing[]>(KEYS.listings, []).filter((l) => ids.has(l.id));
}

export function isBookmarked(listingId: string): boolean {
  return getBookmarks().includes(listingId);
}

export function toggleBookmark(listingId: string) {
  const saved = getBookmarks();
  write(
    KEYS.bookmarks,
    saved.includes(listingId)
      ? saved.filter((id) => id !== listingId)
      : [...saved, listingId]
  );
}

/* ----------------------------- Money helpers ----------------------------- */

export function formatPrice(cents: number, symbol = "$"): string {
  return `${symbol}${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}
