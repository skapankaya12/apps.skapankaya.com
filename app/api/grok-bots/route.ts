import { adminConfigured, getAdminDb, verifyRequestUid } from "@/lib/firebaseAdmin";
import { adminNotifyEmail, emailShell, escapeHtml, sendEmail } from "@/lib/email";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { brand } from "@/lib/brand";
import { GROK_BOTS, grokBotGroupLabel } from "@/lib/grokBots";
import { checkBotDraft, parseBotUrl, type BotSubmission } from "@/lib/botSubmissions";
import { BOT_SUBMISSIONS, readBotPage, toSubmission } from "@/lib/botSubmissions.server";

export const runtime = "nodejs";

/**
 * A maker adding their own Grok Bot.
 *
 *   GET                       → { submissions } the caller has sent, newest first
 *   POST { check: url }       → what the share page says ({ live, name, creator, description })
 *   POST { url, name, summary, group } → saves it for review, { submission }
 *
 * Signed in only. One entry per bot (the share link's id is the document id):
 * a bot already in the curated list or already approved is refused, one
 * waiting for review can be edited only by whoever sent it. The link has to
 * open on x.ai at the moment it is sent. The admin is emailed for each new or
 * changed submission; nothing shows on the site until it is approved.
 */
async function caller(req: Request) {
  if (!adminConfigured) return { error: Response.json({ error: "not_configured" }, { status: 503 }) };
  const uid = await verifyRequestUid(req);
  if (!uid) return { error: Response.json({ error: "sign_in" }, { status: 401 }) };
  return { uid };
}

export async function GET(req: Request) {
  const c = await caller(req);
  if ("error" in c) return c.error;
  const snap = await getAdminDb().collection(BOT_SUBMISSIONS).where("submitterId", "==", c.uid).get();
  const submissions = snap.docs.map((d) => toSubmission(d.id, d.data())).sort((a, b) => b.updatedAt - a.updatedAt);
  return Response.json({ submissions });
}

export async function POST(req: Request) {
  const c = await caller(req);
  if ("error" in c) return c.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Look up a share link before the form is filled in.
  if ("check" in body) {
    const limit = rateLimit(`botcheck:${c.uid}`, 30, 60 * 60 * 1000);
    if (!limit.ok) return tooManyRequests(limit);
    const link = parseBotUrl(body.check);
    if (!link) return Response.json({ error: "bad_link" }, { status: 400 });
    if (GROK_BOTS.some((b) => b.id === link.id)) return Response.json({ error: "already_listed" }, { status: 409 });
    return Response.json(await readBotPage(link.url));
  }

  const limit = rateLimit(`botsubmit:${c.uid}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit);

  const checked = checkBotDraft(body as Record<string, string>);
  if (!checked.ok) return Response.json({ error: "invalid", field: checked.field, message: checked.error }, { status: 400 });
  const draft = checked.value;

  if (GROK_BOTS.some((b) => b.id === draft.id)) {
    return Response.json({ error: "already_listed", message: "That bot is already on The Solo Market." }, { status: 409 });
  }

  const db = getAdminDb();
  const ref = db.collection(BOT_SUBMISSIONS).doc(draft.id);
  const existing = await ref.get();
  if (existing.exists) {
    const prev = existing.data() as BotSubmission;
    if (prev.status === "approved") {
      return Response.json({ error: "already_listed", message: "That bot is already on The Solo Market." }, { status: 409 });
    }
    if (prev.status === "pending" && prev.submitterId !== c.uid) {
      return Response.json({ error: "taken", message: "Someone has already sent that bot. It is waiting for review." }, { status: 409 });
    }
  }

  const page = await readBotPage(draft.url);
  if (!page.live) {
    return Response.json({ error: "dead_link", field: "url", message: "That link doesn't open on x.ai. Check it's published and public." }, { status: 422 });
  }

  const user = (await db.collection("users").doc(c.uid).get()).data() ?? {};
  const now = Date.now();
  const submission: Omit<BotSubmission, "id"> = {
    url: draft.url,
    name: draft.name,
    summary: draft.summary,
    group: draft.group,
    ...(page.creator ? { creator: page.creator } : {}),
    submitterId: c.uid,
    submitterName: String(user.displayName || "").slice(0, 80) || "A maker",
    ...(user.xHandle ? { submitterHandle: String(user.xHandle) } : {}),
    status: "pending",
    createdAt: existing.exists ? (existing.get("createdAt") as number) : now,
    updatedAt: now,
  };
  await ref.set(submission);

  // Best effort: the queue is the record, the email is a nudge.
  await sendEmail({
    to: adminNotifyEmail,
    subject: `New Grok Bot to review: ${draft.name}`,
    html: emailShell(`
      <p style="margin:0 0 12px"><strong>${escapeHtml(draft.name)}</strong> was sent for review by ${escapeHtml(submission.submitterName)}.</p>
      <p style="margin:0 0 12px;color:#4a4a56">${escapeHtml(draft.summary)}</p>
      <p style="margin:0 0 12px;color:#4a4a56">Group: ${escapeHtml(grokBotGroupLabel(draft.group))}<br>Link: ${escapeHtml(draft.url)}</p>
      <p style="margin:0"><a href="${brand.url}/admin/bots">Review it in the admin console</a></p>
    `),
  });

  return Response.json({ submission: { ...submission, id: draft.id } });
}
