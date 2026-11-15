import { FieldValue } from "firebase-admin/firestore";
import { adminConfigured, getAdminDb } from "@/lib/firebaseAdmin";
import { verifyLink } from "@/lib/emailLinks.server";
import { NEWSLETTER, normaliseEmail, subscriberId } from "@/lib/newsletter.server";
import { brand } from "@/lib/brand";

export const runtime = "nodejs";

/**
 * Leave the Thursday email, from the signed link at the foot of every issue.
 *
 * Same shape as /api/email/unsubscribe: GET only shows a button and POST does
 * the work, because mail scanners open every link in a message, and POST is
 * also what Gmail's one-click unsubscribe sends.
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
  button{font:inherit;font-weight:700;font-size:14px;color:#fff;background:#8b1a1a;border:0;border-radius:999px;padding:10px 20px;cursor:pointer}
  a{color:#8b1a1a}
</style></head><body><main>${body}</main></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function params(req: Request) {
  const url = new URL(req.url);
  return { email: normaliseEmail(url.searchParams.get("e")), token: url.searchParams.get("t") ?? "" };
}

const BAD_LINK = page(
  "Link not valid",
  `<h1>This link doesn't work</h1><p>It may be incomplete. Use the unsubscribe link from your latest Thursday email, or reply to it and we'll take you off by hand.</p>`,
  400,
);

export async function GET(req: Request) {
  const { email, token } = params(req);
  if (!email || !verifyLink("newsletter-unsubscribe", email, token)) return BAD_LINK;
  const action = `/api/newsletter/unsubscribe?e=${encodeURIComponent(email)}&amp;t=${encodeURIComponent(token)}`;
  return page(
    "Unsubscribe",
    `<h1>Stop the Thursday email?</h1>
<p>You won't get the weekly new finds from ${brand.name} any more.</p>
<form method="post" action="${action}"><button type="submit">Unsubscribe</button></form>`,
  );
}

export async function POST(req: Request) {
  const { email, token } = params(req);
  if (!email || !verifyLink("newsletter-unsubscribe", email, token)) return BAD_LINK;
  if (!adminConfigured) return page("Try again later", "<h1>Something went wrong</h1><p>Please try again later.</p>", 503);

  await getAdminDb()
    .collection(NEWSLETTER)
    .doc(subscriberId(email))
    .set({ status: "unsubscribed", unsubscribedAt: FieldValue.serverTimestamp() }, { merge: true });

  return page(
    "Unsubscribed",
    `<h1>You're unsubscribed</h1>
<p>No more Thursday emails. You can sign up again any time on the site.</p>
<p><a href="${brand.url}">Back to ${brand.name}</a></p>`,
  );
}
