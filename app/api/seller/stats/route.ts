import {
  verifyRequestUid,
  getAdminDb,
  adminConfigured,
} from "@/lib/firebaseAdmin";
import { getSaveCounts } from "@/lib/saves.server";
import type { SellerStats } from "@/lib/types";

export const runtime = "nodejs";

/**
 * A seller's own numbers: saves and real earnings, per listing.
 *
 * Both have to be computed here rather than in the browser, for the same
 * underlying reason: the Firestore rules deliberately keep the source rows
 * private. A save is readable only by the person who made it, and a purchase
 * only by the buyer who made it. Neither rule is relaxed for this route; the
 * Admin SDK reads them and hands back aggregates that name nobody.
 *
 * Earnings are summed from `purchases.amountCents`, which is what was actually
 * charged at the time. The dashboard used to compute `salesCount * priceCents`
 * from the listing, which silently rewrote history the moment a seller changed
 * their price: ten sales at $15 became $400 of "earnings" after a rise to $40.
 *
 * Scoped to the caller. Listing ids are read back from Firestore and purchases
 * are matched on `sellerId`, so asking about someone else's tools is not
 * something a request can express.
 */
export async function GET(req: Request) {
  if (!adminConfigured) {
    return Response.json({ error: "not-configured" }, { status: 501 });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });

  try {
    const db = getAdminDb();
    const own = await db
      .collection("listings")
      .where("sellerId", "==", uid)
      .get();
    const listingIds = own.docs.map((d) => d.id);

    const sold = await db
      .collection("purchases")
      .where("sellerId", "==", uid)
      .get();

    const salesByListing: Record<string, number> = {};
    const grossByListing: Record<string, number> = {};
    let grossCents = 0;
    for (const doc of sold.docs) {
      const p = doc.data() as { listingId?: string; amountCents?: number };
      const amount = p.amountCents ?? 0;
      grossCents += amount;
      if (p.listingId) {
        salesByListing[p.listingId] = (salesByListing[p.listingId] ?? 0) + 1;
        grossByListing[p.listingId] =
          (grossByListing[p.listingId] ?? 0) + amount;
      }
    }

    const stats: SellerStats = {
      saves: await getSaveCounts(listingIds),
      sales: salesByListing,
      grossByListing,
      grossCents,
      /**
       * True while any purchase of theirs predates `sellerId` being recorded,
       * in which case the totals here are short. The dashboard says so rather
       * than quietly showing a number that is too low.
       */
      complete: await purchasesAreComplete(listingIds, sold.size),
    };
    return Response.json(stats);
  } catch (err) {
    console.error("[api/seller/stats]", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}

/**
 * Whether every sale of theirs carries a `sellerId`.
 *
 * Compares what the seller-scoped query found against the listings' own
 * `salesCount`, which the webhook has always incremented. A shortfall means
 * some purchase rows predate the field and the backfill has not been run.
 */
async function purchasesAreComplete(
  listingIds: string[],
  found: number
): Promise<boolean> {
  if (!listingIds.length) return true;
  const db = getAdminDb();
  const docs = await Promise.all(
    listingIds.map((id) => db.collection("listings").doc(id).get())
  );
  const expected = docs.reduce(
    (sum, d) => sum + ((d.data()?.salesCount as number) ?? 0),
    0
  );
  return found >= expected;
}
