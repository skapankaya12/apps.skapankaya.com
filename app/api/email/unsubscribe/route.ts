import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { verifyUnsubscribe } from "@/lib/emailLinks.server";
import { brand } from "@/lib/brand";

export const runtime = "nodejs";

/**
 * Unsubscribe from lifecycle email (tips and nudges), from a signed link.
 *
 * GET only shows a confirm button, and POST does the work. Mail security
 * scanners open every link in a message to check it, so a GET that
 * unsubscribed would quietly unsubscribe people who never clicked. POST is
 * also what Gmail's one-click unsubscribe sends (the List-Unsubscribe-Post
 * header on each nudge), with the same u and t in the query string.
 *
 * It sets emailLog/{uid}.optOut, which the lifecycle cron checks before every
 * send. Account email (review results, sales, the one-time welcome) is not
 * affected, and the page says so.
 */

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · ${brand.name}</title>
<style>
  body{margin:0;background:#f4f4f6;color:#101014;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
  main{max-width:440px;margin:12vh auto;padding:36px 32px;background:#fff;border:1px solid #ececef;border-radius:22px}
  h1{margin:0 0 10px;font-size:22px;line-height:1.3}
  p{margin:0 0 14px;color:#4a4a56}
  button{font:inherit;font-weight:700;font-size:14px;color:#fff;background:#4f46e5;border:0;border-radius:999px;padding:10px 20px;cursor:pointer}
  a{color:#4f46e5}
</style></head><body><main>${body}</main></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function params(req: Request) {
  const url = new URL(req.url);
  return { uid: url.searchParams.get("u") ?? "", token: url.searchParams.get("t") ?? "" };
}

const BAD_LINK = page(
  "Link not valid",
  `<h1>This link doesn't work</h1><p>It may be incomplete or out of date. Reply to any of our emails and we'll take you off by hand.</p>`,
  400
);

export async function GET(req: Request) {
  const { uid, token } = params(req);
  if (!verifyUnsubscribe(uid, token)) return BAD_LINK;
  const action = `/api/email/unsubscribe?u=${encodeURIComponent(uid)}&amp;t=${encodeURIComponent(token)}`;
  return page(
    "Unsubscribe",
    `<h1>Stop tips like this?</h1>
<p>You won't get tips and reminders from ${brand.name} any more. Emails about your account, like review results and sales, still arrive.</p>
<form method="post" action="${action}"><button type="submit">Unsubscribe</button></form>`
  );
}

export async function POST(req: Request) {
  const { uid, token } = params(req);
  if (!verifyUnsubscribe(uid, token)) return BAD_LINK;
  if (!adminConfigured) return page("Try again later", "<h1>Something went wrong</h1><p>Please try again later.</p>", 503);

  await getAdminDb()
    .collection("emailLog")
    .doc(uid)
    .set({ optOut: true, optOutAt: FieldValue.serverTimestamp() }, { merge: true });

  return page(
    "Unsubscribed",
    `<h1>You're unsubscribed</h1>
<p>No more tips and reminders. Emails about your account, like review results and sales, still arrive.</p>
<p><a href="${brand.url}">Back to ${brand.name}</a></p>`
  );
}
