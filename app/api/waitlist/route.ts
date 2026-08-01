import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Launch-list signup. Appends the email to a Google Sheet via an Apps Script
 * Web App, server-to-server, so the script URL stays out of the browser bundle
 * and there's no CORS dance. Set the deployed /exec URL as:
 *
 *   WAITLIST_WEBHOOK_URL   — the Apps Script Web App URL (…/exec)
 *
 * Same shape as /api/contact. If it isn't set, we say so plainly rather than
 * pretending the address was saved.
 */

// Unauthenticated and it writes a row, so it's cheap to abuse. A real person
// signs up once; ten attempts in ten minutes is already generous.
const LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const limit = rateLimit(`waitlist:${clientIp(request)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit);

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid-body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  // Deliberately loose: the only real test of an address is sending to it, and
  // a strict regex rejects valid addresses more often than it catches typos.
  if (!email.includes("@") || email.length < 5 || email.length > 254) {
    return Response.json({ ok: false, error: "invalid-input" }, { status: 400 });
  }

  const webhook = process.env.WAITLIST_WEBHOOK_URL;
  if (!webhook) {
    return Response.json({ ok: false, error: "not-configured" }, { status: 501 });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        email,
        source: request.headers.get("referer") ?? "",
      }),
      // Apps Script redirects to a googleusercontent URL on success.
      redirect: "follow",
    });
    if (!res.ok) {
      console.error("[waitlist] webhook returned", res.status);
      return Response.json({ ok: false, error: "upstream" }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[waitlist] webhook failed:", err);
    return Response.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
