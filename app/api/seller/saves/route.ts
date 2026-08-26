import {
  verifyRequestUid,
  getAdminDb,
  adminConfigured,
} from "@/lib/firebaseAdmin";
import { getSaveCounts } from "@/lib/saves.server";

export const runtime = "nodejs";

/**
 * How many people have saved each of the caller's own listings.
 *
 * A save is private in the Firestore rules, so a seller cannot count these from
 * the client and this route is the only way they see the number. It answers
 * only for listings the caller actually owns: the listing ids are read back
 * from Firestore rather than taken from the request, so asking about someone
 * else's tool is not something the caller can express.
 *
 * The number is an aggregate and never names anyone. Which people saved a tool
 * is not the seller's business, and nothing here can reveal it.
 */
export async function GET(req: Request) {
  if (!adminConfigured) {
    return Response.json({ error: "not-configured" }, { status: 501 });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });

  try {
    const own = await getAdminDb()
      .collection("listings")
      .where("sellerId", "==", uid)
      .get();
    const counts = await getSaveCounts(own.docs.map((d) => d.id));
    return Response.json({ counts });
  } catch (err) {
    console.error("[api/seller/saves]", err);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
