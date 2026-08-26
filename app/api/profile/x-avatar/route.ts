import { verifyRequestUid, adminConfigured } from "@/lib/firebaseAdmin";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { fetchImage, ImportError } from "@/lib/import/safeFetch";
import { AVATAR_ACCEPT, MAX_AVATAR_BYTES } from "@/lib/media";
import { normalizeXHandle, xHandleProblem } from "@/lib/xhandle";

export const runtime = "nodejs";

/**
 * Fetch the photo on a seller's X profile and hand the bytes to the browser.
 *
 * Why this exists: most sellers will never open a file picker to set an avatar,
 * and the seller sphere on /sell is only worth having if it shows faces. Typing
 * a handle they already know by heart is a much lower bar than finding,
 * cropping and uploading a photo.
 *
 * It returns bytes rather than saving anything, deliberately, for the reason
 * spelled out in /api/import/asset: avatars go from the browser to Storage
 * under a path scoped to the seller's own uid, and that uid binding is enforced
 * by storage.rules. The Admin SDK ignores those rules, so uploading here would
 * quietly step around the one control on that path. The browser turns these
 * bytes into a File and hands them to the same uploadAvatar() a picked file
 * goes through, so there is exactly one way an avatar reaches the bucket.
 *
 * Why not X's own API: user lookup is not on X's free tier any more, so reading
 * a public profile photo would mean a paid plan and an API key in every
 * environment. unavatar.io resolves the same public image without either. It is
 * a third party in the path, which is why nothing here depends on it: the fetch
 * is one-shot, the result is optional, and the file picker beside this button
 * keeps working when it fails.
 */

/** Enough for a few typos and a change of mind, not enough to proxy-scrape. */
const AVATAR_LIMIT = 20;
const AVATAR_WINDOW_MS = 60 * 60 * 1000;

/** What the avatar upload will accept, so a GIF is refused here not at Storage. */
const ALLOWED = AVATAR_ACCEPT.split(",");

export async function POST(req: Request) {
  if (!adminConfigured) {
    return Response.json({ ok: false, error: "not-configured" }, { status: 501 });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`x-avatar:${uid}`, AVATAR_LIMIT, AVATAR_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit);

  const { handle } = (await req.json().catch(() => ({}))) as { handle?: string };
  const problem = xHandleProblem(handle ?? "");
  if (problem) {
    return Response.json({ ok: false, error: problem }, { status: 400 });
  }

  // Validated to [A-Za-z0-9_]{1,15} above, so nothing here can escape the path
  // segment. The host is ours to choose, not the seller's.
  const clean = normalizeXHandle(handle ?? "");

  try {
    // fallback=false makes a missing account a 404 rather than a generated
    // placeholder. A seller who mistypes their handle should hear about it, not
    // end up with a stranger's initials as their face.
    const image = await fetchImage(
      `https://unavatar.io/x/${clean}?fallback=false`
    );

    if (!ALLOWED.includes(image.contentType)) {
      return Response.json(
        { ok: false, error: "That photo is in a format we can't use." },
        { status: 400 }
      );
    }
    // storage.rules caps avatars at 2MB, so a larger one would fail at upload
    // with an opaque 403. Catch it here where the message can say what happened.
    if (image.bytes.length > MAX_AVATAR_BYTES) {
      return Response.json(
        { ok: false, error: "That photo is too large to use here." },
        { status: 400 }
      );
    }

    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.contentType,
        "Content-Length": String(image.bytes.length),
        // The browser is about to upload this to a permanent home. Nothing in
        // between has any business keeping a copy.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ImportError) {
      // The common case by far is a handle that doesn't exist, and the
      // underlying message ("That image returned an error (404)") describes the
      // plumbing rather than the mistake.
      return Response.json(
        {
          ok: false,
          error: "Couldn't find a photo on that X account. Check the handle.",
        },
        { status: 400 }
      );
    }
    console.error("[x-avatar] failed:", err);
    return Response.json(
      { ok: false, error: "Couldn't fetch that photo." },
      { status: 500 }
    );
  }
}
