import { FieldValue } from "firebase-admin/firestore";
import { adminConfigured, getAdminDb } from "@/lib/firebaseAdmin";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * The footer's visitor count: "● N online · N visitors", the way AI Standings
 * shows it.
 *
 * Visitors: each browser is counted once, ever. The browser keeps a random id
 * and a "counted" mark in its own storage and says `first: true` only the
 * first time. Online: an open page checks in about once a minute; anyone seen
 * in the last two minutes is online. A check-in stores the random id and a
 * time, nothing else: no IP, no cookie, no page, nothing that says who a
 * person is. Check-ins older than an hour are deleted as they are found.
 *
 * Public numbers, so GET needs no account. Counted server-side only: there is
 * no Firestore rule for `stats` or `presence`, so browsers can neither read
 * nor write them directly.
 */

const ONLINE_MS = 2 * 60_000;
const KEEP_MS = 60 * 60_000;

async function counts() {
  const db = getAdminDb();
  const [site, online] = await Promise.all([
    db.collection("stats").doc("site").get(),
    db.collection("presence").where("at", ">", Date.now() - ONLINE_MS).count().get(),
  ]);
  return { visitors: (site.get("visitors") as number | undefined) ?? 0, online: online.data().count };
}

export async function GET() {
  if (!adminConfigured) return Response.json({ visitors: 0, online: 0 });
  return Response.json(await counts(), { headers: { "Cache-Control": "public, max-age=30" } });
}

export async function POST(request: Request) {
  // A page checks in once a minute; this leaves room for a few tabs.
  const limit = rateLimit(`visits:${clientIp(request)}`, 12, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  if (!adminConfigured) return Response.json({ visitors: 0, online: 0 });

  let body: { id?: unknown; first?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  const id = typeof body.id === "string" && /^[a-z0-9-]{16,64}$/i.test(body.id) ? body.id : null;
  if (!id) return Response.json({ error: "bad-request" }, { status: 400 });

  const db = getAdminDb();
  const now = Date.now();
  await Promise.all([
    db.collection("presence").doc(id).set({ at: now }),
    body.first === true ? db.collection("stats").doc("site").set({ visitors: FieldValue.increment(1) }, { merge: true }) : null,
  ]);

  // Now and then, sweep check-ins nobody has renewed for an hour.
  if (Math.random() < 0.05) {
    const stale = await db.collection("presence").where("at", "<", now - KEEP_MS).limit(100).get();
    if (!stale.empty) {
      const batch = db.batch();
      stale.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  return Response.json(await counts());
}
