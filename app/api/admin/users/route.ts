import {
  verifyRequestUid,
  getAdminDb,
  adminConfigured,
} from "@/lib/firebaseAdmin";
import type { AdminUserList, AdminUserRow, Role } from "@/lib/types";

export const runtime = "nodejs";

/** Safety valve, not a page size: the console lists everyone in one panel. */
const MAX_USERS = 500;

/**
 * Every registered account, for the admin console's users panel.
 *
 * Newest first, by createdAt.
 *
 * The sort happens here rather than as a Firestore orderBy because an orderBy
 * silently drops documents that lack the field, and an account written before
 * createdAt existed would then be missing from a list whose whole job is to be
 * complete. Those legacy accounts sort to the bottom, where their blank date
 * says why.
 *
 * MAX_USERS is applied after the sort, so what gets cut is always the oldest
 * accounts rather than an arbitrary slice of the collection. The cost of that
 * is reading the collection whole; at marketplace scale that's a few hundred
 * documents, read once per panel open. When it stops being, this wants a paged
 * query over createdAt with a real cursor, and a backfill of the accounts
 * missing the field so the orderBy is safe to use.
 *
 * Admin-only. Emails are in here, so the gate is the same one /api/admin/stats
 * uses: the caller's own user doc, not a token claim.
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

  const snap = await db.collection("users").get();

  const all: AdminUserRow[] = snap.docs
    .map((d) => {
      const data = d.data() as Partial<AdminUserRow> & {
        stripeChargesEnabled?: boolean;
      };
      return {
        uid: d.id,
        email: data.email ?? "",
        displayName: data.displayName ?? "",
        role: (data.role ?? "buyer") as Role,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
        chargesEnabled: data.stripeChargesEnabled === true,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const counts: Record<Role, number> = { buyer: 0, seller: 0, admin: 0 };
  for (const u of all) counts[u.role] += 1;

  const body: AdminUserList = {
    users: all.slice(0, MAX_USERS),
    // total and counts cover every account, capped rows or not, so the panel
    // never presents a partial list as the full membership.
    total: all.length,
    counts,
  };
  return Response.json(body);
}
