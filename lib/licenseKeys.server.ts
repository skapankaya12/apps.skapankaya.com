import { createHash } from "node:crypto";
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { LicenseKeyStock } from "@/lib/types";
import { LICENSE_KEYS_STOCK_MAX } from "@/lib/licenseKeys";

/*
  A listing's licence keys, stored where no browser can reach them.

  listings/{id}/licenseKeys/{keyId}. firestore.rules refuses every client read
  and write on that path, so the only code that ever sees a key is this file,
  running with the Admin SDK. Each key is worth one sale, so the seller gets
  counts back, never the keys, and a buyer gets exactly one, copied onto their
  purchase.

  The document id is a hash of the key. That is what makes a key impossible to
  load twice: the same key always lands on the same document, so pasting a
  batch again, or a batch that overlaps an earlier one, adds nothing twice and
  can never sell one key to two people.
*/

export type LicenseKeyStatus = "available" | "assigned" | "review";

export interface LicenseKeyDoc {
  key: string;
  status: LicenseKeyStatus;
  addedAt: number;
  addedBy: string;
  assignedAt?: number;
  /** The purchase (Stripe session id) it went to, once assigned. */
  purchaseId?: string;
}

function keysOf(db: Firestore, listingId: string) {
  return db.collection("listings").doc(listingId).collection("licenseKeys");
}

function keyDocId(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export interface AddKeysResult {
  added: number;
  /** Already loaded on this listing, so skipped. */
  alreadyLoaded: number;
  /** Refused because the listing would hold more unused keys than allowed. */
  overLimit: number;
}

/**
 * Store a batch of keys against a listing. Caller has already checked that
 * `uid` owns the listing or is an admin, and parsed the keys.
 */
export async function addLicenseKeys(
  listingId: string,
  keys: string[],
  uid: string
): Promise<AddKeysResult> {
  const db = getAdminDb();
  const col = keysOf(db, listingId);
  if (keys.length === 0) return { added: 0, alreadyLoaded: 0, overLimit: 0 };

  const refs = keys.map((k) => col.doc(keyDocId(k)));
  const existing = await db.getAll(...refs);
  const fresh = keys.filter((_, i) => !existing[i].exists);
  const alreadyLoaded = keys.length - fresh.length;

  const available = (await col.where("status", "==", "available").count().get()).data().count;
  const room = Math.max(0, LICENSE_KEYS_STOCK_MAX - available);
  const toAdd = fresh.slice(0, room);

  const now = Date.now();
  // 500 writes is a batch's ceiling.
  for (let i = 0; i < toAdd.length; i += 500) {
    const batch = db.batch();
    for (const key of toAdd.slice(i, i + 500)) {
      const doc: LicenseKeyDoc = { key, status: "available", addedAt: now, addedBy: uid };
      batch.set(col.doc(keyDocId(key)), doc);
    }
    await batch.commit();
  }

  return { added: toAdd.length, alreadyLoaded, overLimit: fresh.length - toAdd.length };
}

/** How many keys a listing holds in each state. Aggregations, no key read. */
export async function getLicenseKeyStock(listingId: string): Promise<LicenseKeyStock> {
  const col = keysOf(getAdminDb(), listingId);
  const [available, assigned, review] = await Promise.all(
    (["available", "assigned", "review"] as const).map((s) =>
      col.where("status", "==", s).count().get()
    )
  );
  return {
    available: available.data().count,
    assigned: assigned.data().count,
    review: review.data().count,
  };
}

/**
 * Take one unused key inside the caller's transaction and mark it given to
 * `purchaseId`. Answers with the key, or null when none is left.
 *
 * Inside a transaction so two sales landing at the same moment cannot both be
 * handed the same key: Firestore retries whichever commits second, and on the
 * retry the key it read is no longer available.
 */
export async function claimLicenseKey(
  tx: Transaction,
  listingId: string,
  purchaseId: string
): Promise<string | null> {
  const col = keysOf(getAdminDb(), listingId);
  const snap = await tx.get(col.where("status", "==", "available").limit(1));
  const doc = snap.docs[0];
  if (!doc) return null;
  tx.update(doc.ref, {
    status: "assigned" satisfies LicenseKeyStatus,
    assignedAt: Date.now(),
    purchaseId,
  });
  return (doc.data() as LicenseKeyDoc).key;
}

export interface FulfilledPurchase {
  purchaseId: string;
  buyerId: string;
  listingTitle: string;
  key: string;
  instructions: string;
  redeemUrl: string;
}

/**
 * Give a key to every buyer of this listing who is still waiting for one.
 *
 * A buyer waits only when two sales raced for the last key. Called whenever
 * keys are added, so restocking is what delivers them: nobody has to remember
 * to do it by hand. Oldest purchase first. Stops when the keys run out again.
 */
export async function fulfillPendingPurchases(listingId: string): Promise<FulfilledPurchase[]> {
  const db = getAdminDb();
  const waiting = await db
    .collection("purchases")
    .where("listingId", "==", listingId)
    .where("licenseKeyPending", "==", true)
    .get();
  const ordered = waiting.docs.sort(
    (a, b) => (a.data().createdAt ?? 0) - (b.data().createdAt ?? 0)
  );

  const done: FulfilledPurchase[] = [];
  for (const snap of ordered) {
    const result = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(snap.ref);
      if (!fresh.data()?.licenseKeyPending) return null; // someone got there first
      const key = await claimLicenseKey(tx, listingId, snap.id);
      if (!key) return undefined; // out again
      tx.update(snap.ref, { licenseKey: key, licenseKeyPending: FieldValue.delete() });
      return key;
    });
    if (result === undefined) break;
    if (result === null) continue;
    const p = snap.data();
    done.push({
      purchaseId: snap.id,
      buyerId: p.buyerId,
      listingTitle: p.listingTitle ?? "your tool",
      key: result,
      instructions: p.licenseInstructions ?? "",
      redeemUrl: p.licenseRedeemUrl ?? "",
    });
  }
  return done;
}

/**
 * The key an admin tests during review.
 *
 * Set aside rather than merely shown: once it has been activated on the
 * admin's machine it may have used up one of its activations, so it must never
 * then be sold. Asking again returns the same key rather than using up another.
 */
export async function takeReviewKey(listingId: string): Promise<string | null> {
  const db = getAdminDb();
  const col = keysOf(db, listingId);
  return db.runTransaction(async (tx) => {
    const held = await tx.get(col.where("status", "==", "review").limit(1));
    if (held.docs[0]) return (held.docs[0].data() as LicenseKeyDoc).key;
    const snap = await tx.get(col.where("status", "==", "available").limit(1));
    const doc = snap.docs[0];
    if (!doc) return null;
    tx.update(doc.ref, { status: "review" satisfies LicenseKeyStatus });
    return (doc.data() as LicenseKeyDoc).key;
  });
}

/**
 * Delete every key not yet given to anyone. For a seller who pasted the wrong
 * batch, or who is leaving. Assigned keys stay, because a buyer holds them.
 */
export async function removeUnusedLicenseKeys(listingId: string): Promise<number> {
  const db = getAdminDb();
  const snap = await keysOf(db, listingId).where("status", "==", "available").get();
  for (let i = 0; i < snap.docs.length; i += 500) {
    const batch = db.batch();
    for (const d of snap.docs.slice(i, i + 500)) batch.delete(d.ref);
    await batch.commit();
  }
  return snap.size;
}
