import {
  verifyRequestUid,
  getAdminDb,
  adminConfigured,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Marketplace counters for the admin console that can't be derived from the
 * listings the client already holds.
 *
 * Right now that's the registered-user count. The Firestore rules let an admin
 * read every user doc, so the client could count them itself, but that means
 * pulling every account (email and all) into the browser to end up with one
 * number. `count()` is an aggregation query: Firestore returns the total and
 * bills one read per 1000 documents, so this stays cheap as signups grow.
 *
 * Admin-only, checked against the caller's own user doc rather than a claim on
 * the token — role lives in Firestore and is assigned out-of-band.
 */
export async function GET(req: Request) {
  if (!adminConfigured) {
    return Response.json({ error: "not-configured" }, { status: 501 });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const caller = await db.collection("users").doc(uid).get();
  if (caller.data()?.role !== "admin") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const users = await db.collection("users").count().get();

  return Response.json({ userCount: users.data().count });
}
