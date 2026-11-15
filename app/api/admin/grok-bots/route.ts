import { revalidatePath } from "next/cache";
import { adminConfigured, getAdminAuth, getAdminDb, verifyRequestUid } from "@/lib/firebaseAdmin";
import { emailShell, escapeHtml, sendEmail } from "@/lib/email";
import { brand } from "@/lib/brand";
import type { BotSubmission } from "@/lib/botSubmissions";
import { BOT_SUBMISSIONS, toSubmission } from "@/lib/botSubmissions.server";

export const runtime = "nodejs";

/**
 * The review queue for makers' Grok Bots.
 *
 *   GET                                         → { submissions } all of them, pending first
 *   POST { id, action: "approve" | "reject", note? } → { submission }
 *
 * Admin only, gated on the caller's own user document like the other admin
 * routes. A decision emails the maker (the address from Firebase Auth, never
 * from a field they can edit) and asks for the feed pages to refresh, so an
 * approved bot shows straight away rather than within five minutes.
 */
async function admin(req: Request) {
  if (!adminConfigured) return { error: Response.json({ error: "not_configured" }, { status: 503 }) };
  const uid = await verifyRequestUid(req);
  if (!uid) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const me = await getAdminDb().collection("users").doc(uid).get();
  if (me.data()?.role !== "admin") return { error: Response.json({ error: "forbidden" }, { status: 403 }) };
  return { uid };
}

const ORDER: Record<string, number> = { pending: 0, rejected: 1, approved: 2 };

export async function GET(req: Request) {
  const a = await admin(req);
  if ("error" in a) return a.error;
  const snap = await getAdminDb().collection(BOT_SUBMISSIONS).get();
  const submissions = snap.docs
    .map((d) => toSubmission(d.id, d.data()))
    .sort((x, y) => ORDER[x.status] - ORDER[y.status] || y.updatedAt - x.updatedAt);
  return Response.json({ submissions });
}

export async function POST(req: Request) {
  const a = await admin(req);
  if ("error" in a) return a.error;
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; action?: unknown; note?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action === "approve" || body.action === "reject" ? body.action : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!id || !action) return Response.json({ error: "bad_request" }, { status: 400 });

  const ref = getAdminDb().collection(BOT_SUBMISSIONS).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return Response.json({ error: "not_found" }, { status: 404 });

  const now = Date.now();
  const update: Partial<BotSubmission> = {
    status: action === "approve" ? "approved" : "rejected",
    reviewedAt: now,
    updatedAt: now,
    ...(note ? { reviewNote: note } : { reviewNote: "" }),
  };
  await ref.set(update, { merge: true });
  const submission = toSubmission(id, { ...snap.data(), ...update });

  // Show an approval (or remove a reversed one) without waiting for the cache.
  for (const p of ["/", "/browse", "/grok-bots"]) {
    try {
      revalidatePath(p);
    } catch {}
  }

  try {
    const email = (await getAdminAuth().getUser(submission.submitterId)).email;
    if (email) {
      const approved = action === "approve";
      await sendEmail({
        to: email,
        subject: approved ? `${submission.name} is on The Solo Market` : `A note on ${submission.name}`,
        html: emailShell(`
          <p style="margin:0 0 12px">${
            approved
              ? `Your Grok Bot <strong>${escapeHtml(submission.name)}</strong> is now listed with the other Grok Bots on ${escapeHtml(brand.name)}.`
              : `Thanks for sending <strong>${escapeHtml(submission.name)}</strong>. We haven't listed it this time.`
          }</p>
          ${note ? `<p style="margin:0 0 12px;color:#4a4a56">${escapeHtml(note)}</p>` : ""}
          <p style="margin:0"><a href="${brand.url}/grok-bots">${approved ? "See it on the Grok Bots page" : "See the Grok Bots page"}</a></p>
        `),
      });
    }
  } catch (err) {
    console.error("[admin/grok-bots] decision email failed:", err);
  }

  return Response.json({ submission });
}
