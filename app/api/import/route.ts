import { verifyRequestUid, adminConfigured } from "@/lib/firebaseAdmin";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { importListing, ImportError, MAX_SOURCES } from "@/lib/import";

export const runtime = "nodejs";

/**
 * Read a product's own pages and hand back a listing draft.
 *
 * The form asks a seller to retype what they have already written somewhere
 * else — a website, a README, a launch page — and that retyping is the reason
 * people abandon it. This route does the reading.
 *
 * Nothing here writes anything. The response is a suggestion the form pours
 * into empty fields, and the seller confirms or overwrites every one of them
 * before a listing exists. That matters beyond convenience: the seller is
 * asserting that the tool is theirs to sell, and they can only do that about
 * words they have actually read.
 */

// Each call makes several outbound requests, so this is the endpoint most worth
// abusing as a proxy. Twenty an hour is far above real use — a seller imports
// once or twice per listing — and far below anything useful to a crawler.
const IMPORT_LIMIT = 20;
const IMPORT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!adminConfigured) {
    return Response.json({ ok: false, error: "not-configured" }, { status: 501 });
  }

  // Sellers only. Import is a convenience for someone already filling the form,
  // not a public URL-reading service that happens to live on our domain.
  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const limit = rateLimit(`import:${uid}`, IMPORT_LIMIT, IMPORT_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit);

  const body = (await req.json().catch(() => ({}))) as { urls?: unknown };
  const urls = Array.isArray(body.urls)
    ? body.urls.filter((u): u is string => typeof u === "string").slice(0, MAX_SOURCES)
    : [];

  if (urls.length === 0) {
    return Response.json({ ok: false, error: "Paste a link to import from." }, { status: 400 });
  }

  try {
    const result = await importListing(urls);
    return Response.json({ ok: true, result });
  } catch (err) {
    if (err instanceof ImportError) {
      return Response.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error("[import] failed:", err);
    return Response.json(
      { ok: false, error: "Something went wrong reading those links." },
      { status: 500 }
    );
  }
}
