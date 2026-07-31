import {
  verifyRequestUid,
  getAdminDb,
  getAdminAuth,
  adminConfigured,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Permanently delete the caller's account: their user doc and the Firebase Auth
 * account. Purchases are kept (they're the sellers' sales records) and listings
 * are left intact so buyers who paid for a departing seller's tool don't lose
 * access — the owner can prune orphaned listings from admin. The client
 * re-authenticates before calling this, so a valid token here means it's really
 * them.
 */
export async function POST(req: Request) {
  if (!adminConfigured) {
    return Response.json({ error: "not-configured" }, { status: 501 });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });

  const db = getAdminDb();
  await db.collection("users").doc(uid).delete();

  try {
    await getAdminAuth().deleteUser(uid);
  } catch (e) {
    // If the auth record is already gone, treat it as success.
    const code = (e as { code?: string }).code;
    if (code !== "auth/user-not-found") {
      console.error("[account/delete] auth delete failed:", e);
      return Response.json({ error: "delete-failed" }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}
