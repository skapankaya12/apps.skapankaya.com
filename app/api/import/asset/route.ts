import { verifyRequestUid, adminConfigured } from "@/lib/firebaseAdmin";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { fetchImage, ImportError } from "@/lib/import/safeFetch";

export const runtime = "nodejs";

/**
 * Fetch one imported image and hand the bytes to the browser.
 *
 * This exists because of how uploads work here, not for its own sake. Listing
 * files go straight from the browser to Firebase Storage under a path scoped to
 * the seller's uid, which is what binds a package to its owner (storage.rules,
 * and the check in /api/download). Uploading server-side would sidestep that
 * binding — the Admin SDK ignores Storage rules — so imported screenshots take
 * the same road as chosen ones: the browser turns these bytes into a File and
 * uploads it on submit, exactly like a file picked from disk.
 *
 * The browser can't fetch them itself: a foreign host's images are opaque to
 * a cross-origin request, and the seller's uid isn't a CORS policy anyone else
 * has agreed to.
 */

// One per screenshot, five per listing, plus retries and second thoughts.
const ASSET_LIMIT = 60;
const ASSET_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!adminConfigured) {
    return Response.json({ ok: false, error: "not-configured" }, { status: 501 });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const limit = rateLimit(`import-asset:${uid}`, ASSET_LIMIT, ASSET_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit);

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url || typeof url !== "string") {
    return Response.json({ ok: false, error: "no-url" }, { status: 400 });
  }

  try {
    const image = await fetchImage(url);
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.contentType,
        "Content-Length": String(image.bytes.length),
        // A seller's imported screenshot is not something to keep anywhere.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ImportError) {
      return Response.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error("[import asset] failed:", err);
    return Response.json({ ok: false, error: "Couldn't fetch that image." }, { status: 500 });
  }
}
