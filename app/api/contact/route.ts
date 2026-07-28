import { brand } from "@/lib/brand";

/**
 * Contact-form endpoint. Sends the message to the support inbox via Resend's
 * REST API (no SDK dependency). If email isn't configured yet, it responds with
 * a clear "not configured" signal so the form can fall back to a mailto link
 * instead of silently pretending to have sent something.
 *
 * Requires (see .env.example / EMAIL_SETUP.md):
 *   RESEND_API_KEY   — Resend API key
 *   EMAIL_FROM       — verified sender, e.g. "Apps Marketplace <hello@your-domain>"
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

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    // Email isn't wired up yet — tell the client so it can show a mailto fallback.
    return Response.json({ ok: false, error: "not-configured" }, { status: 501 });
  }

  const label = TOPIC_LABELS[topic] ?? "Message";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [brand.supportEmail],
      reply_to: email,
      subject: `[${label}] ${brand.name} contact form`,
      text: `Topic: ${label}\nFrom: ${email}\n\n${message}`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[contact] Resend error:", res.status, detail);
    return Response.json({ ok: false, error: "send-failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
