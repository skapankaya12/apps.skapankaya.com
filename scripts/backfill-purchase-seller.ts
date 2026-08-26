/**
 * One-off: stamp `sellerId` onto purchase rows written before it existed.
 *
 * A purchase recorded who bought a tool and what they paid, but not who was
 * paid. That made "everything this seller sold" unanswerable, which is what a
 * seller's real earnings have to be summed from: the amount on the purchase is
 * what was actually charged, while the listing's price is only what it costs
 * today. Without this, a seller who changes their price rewrites their own
 * earnings history.
 *
 * The seller is recovered by joining through `listingId`. That is safe for old
 * rows because a listing's `sellerId` is immutable in firestore.rules, so the
 * owner today is the owner who was paid. New purchases take it straight from
 * the Stripe session metadata instead.
 *
 * A purchase whose listing has since been deleted cannot be resolved and is
 * reported, not guessed at.
 *
 * Safe to re-run: it only writes rows that have no `sellerId`. Run against ONE
 * project at a time, and check which one — there is no .firebaserc in this repo
 * on purpose, to stop cross-environment mistakes:
 *
 *   npx tsx --env-file=.env.local scripts/backfill-purchase-seller.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-purchase-seller.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const dryRun = process.argv.includes("--dry-run");

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing env. Need FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL\n" +
      "and FIREBASE_ADMIN_PRIVATE_KEY.\n" +
      "Try: npx tsx --env-file=.env.local scripts/backfill-purchase-seller.ts --dry-run"
  );
  process.exit(1);
}

async function main() {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const db = getFirestore();

  console.log(`${dryRun ? "[dry run] " : ""}project ${projectId}\n`);

  const [purchases, listings] = await Promise.all([
    db.collection("purchases").get(),
    db.collection("listings").get(),
  ]);

  const sellerOf = new Map<string, string>();
  for (const doc of listings.docs) {
    const sellerId = doc.data().sellerId as string | undefined;
    if (sellerId) sellerOf.set(doc.id, sellerId);
  }

  let ok = 0;
  let filled = 0;
  let unresolved = 0;

  for (const doc of purchases.docs) {
    const p = doc.data() as { sellerId?: string; listingId?: string };
    if (p.sellerId) {
      ok += 1;
      continue;
    }
    const sellerId = p.listingId ? sellerOf.get(p.listingId) : undefined;
    if (!sellerId) {
      console.log(
        `  unresolved ${doc.id}  (listing ${p.listingId ?? "?"} no longer exists)`
      );
      unresolved += 1;
      continue;
    }
    console.log(`  ${dryRun ? "would  " : "fill   "} ${doc.id}  → ${sellerId}`);
    if (!dryRun) await doc.ref.update({ sellerId });
    filled += 1;
  }

  console.log(
    `\n${purchases.size} purchase(s) · ${ok} already stamped · ${filled} ${
      dryRun ? "would be " : ""
    }filled · ${unresolved} unresolved.`
  );
  if (unresolved) {
    console.log(
      "Unresolved rows keep working for the buyer (their library reads by buyerId);\n" +
        "they are simply missing from the seller's earnings total."
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
