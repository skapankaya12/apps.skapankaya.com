export const runtime = "nodejs";

/**
 * Contact-form endpoint. Forwards each submission to a Google Sheet via a Google
 * Apps Script Web App (server-to-server, so the script URL stays off the client
 * and there's no CORS/redirect dance). Set the deployed /exec URL as:
 *
 *   CONTACT_WEBHOOK_URL   — the Apps Script Web App URL (…/exec)
 *
 * If it's not set yet, we respond with a clear "not configured" signal so the
 * form can show a graceful message instead of pretending to have sent.
 */

const TOPIC_LABELS: Record<string, string> = {
  request: "Tool request",
  support: "Support",
  selling: "Selling",
  other: "Other",
};

export async function POST(request: Request) {
  let body: { topic?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid-body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const message = (body.message ?? "").trim();
  const topic = body.topic ?? "other";

  if (!email.includes("@") || message.length < 10) {
    return Response.json({ ok: false, error: "invalid-input" }, { status: 400 });
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) {
    return Response.json({ ok: false, error: "not-configured" }, { status: 501 });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        topic: TOPIC_LABELS[topic] ?? "Other",
        email,
        message,
      }),
      // Apps Script /exec answers with a 302 to a googleusercontent URL; fetch
      // follows it by default, so a 2xx here means the row was written.
      redirect: "follow",
    });
    if (!res.ok) {
      console.error("[contact] sheet webhook error:", res.status, await res.text().catch(() => ""));
      return Response.json({ ok: false, error: "send-failed" }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[contact] sheet webhook threw:", e);
    return Response.json({ ok: false, error: "send-failed" }, { status: 502 });
  }
}
