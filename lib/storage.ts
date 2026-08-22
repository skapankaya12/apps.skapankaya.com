"use client";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";

/* ---------------------------------------------------------------------------
   Client-side uploads to Firebase Storage.

   Three kinds of files, matching the paths in storage.rules:

   - The app package (.zip) → submissions/{uid}/{listingId}.zip. Private: nobody
     reads it from the client. After a purchase, the server mints a short-lived
     signed URL (see app/api/download). We keep the raw path.
   - Demo video + screenshots → public/… . These are marketing assets shown on
     the listing page to everyone, so they get a permanent public download URL.

   Every path starts with the uploader's uid, and storage.rules only lets a user
   write inside their own uid folder. That is load-bearing, not cosmetic: a
   listing id is public (approved listings are world-readable and carry
   packagePath), so a path keyed only by listing id would let any signed-in user
   overwrite another seller's package or screenshots. Do not drop the uid.

   Uploads are keyed by the listing id, which we reserve before writing the
   Firestore doc (see reserveListingId in lib/store), so a listing carries its
   media from the moment it's created — no empty-then-patch window.
--------------------------------------------------------------------------- */

const storage = getStorage(app);

/**
 * Cache header for the public marketing assets (demo video, screenshots).
 *
 * Firebase Storage defaults to `private, max-age=0`, so every visit re-fetched
 * every demo from scratch — tens of megabytes per browse page, per visit, for
 * files that never change. `immutable` is safe here precisely because these
 * paths are never reused: the demo is keyed by listing id and the screenshots
 * carry an upload timestamp, so replacing one produces a new URL rather than
 * new bytes at the old one.
 *
 * Not applied to packages — those are private and served through short-lived
 * signed URLs, never cached by a browser.
 */
const PUBLIC_ASSET_CACHE = "public, max-age=31536000, immutable";

/** Lowercase file extension including the dot, or "" if none. */
function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i > -1 ? name.slice(i).toLowerCase() : "";
}

/**
 * Upload the app package. Returns the Storage path (not a URL) to store as the
 * listing's packagePath; downloads are always brokered server-side.
 */
export async function uploadPackage(
  uid: string,
  listingId: string,
  file: File
): Promise<string> {
  const path = `submissions/${uid}/${listingId}.zip`;
  await uploadBytes(ref(storage, path), file, {
    contentType: file.type || "application/zip",
  });
  return path;
}

/**
 * Upload the demo video to the public bucket; returns its public URL.
 *
 * The filename carries a timestamp so a replacement never lands on the path it
 * replaced. That's required, not tidy: these are served `immutable` for a year,
 * so overwriting in place would leave every browser that had seen the old demo
 * showing it until the cache expired.
 */
export async function uploadDemoVideo(
  uid: string,
  listingId: string,
  file: File
): Promise<string> {
  const path = `public/demos/${uid}/${listingId}-${Date.now()}${
    ext(file.name) || ".mp4"
  }`;
  const r = ref(storage, path);
  await uploadBytes(r, file, {
    contentType: file.type || "video/mp4",
    cacheControl: PUBLIC_ASSET_CACHE,
  });
  return getDownloadURL(r);
}

/**
 * Upload a poster still cut from the demo video (see captureVideoPoster).
 *
 * Lives under the screenshots prefix so it needs no new rule in storage.rules —
 * that path already allows image/* writes inside the uploader's own folder.
 * It is never added to `screenshots`; it's referenced by `posterImage` alone.
 */
export async function uploadPoster(
  uid: string,
  listingId: string,
  blob: Blob
): Promise<string> {
  const path = `public/shots/${uid}/${listingId}/poster-${Date.now()}.jpg`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, {
    contentType: "image/jpeg",
    cacheControl: PUBLIC_ASSET_CACHE,
  });
  return getDownloadURL(r);
}

/** Upload screenshots to the public bucket; returns their public URLs in order. */
export async function uploadScreenshots(
  uid: string,
  listingId: string,
  files: File[]
): Promise<string[]> {
  // Unique filename per upload so re-submissions never overwrite screenshots the
  // seller chose to keep from a previous version.
  const stamp = Date.now();
  return Promise.all(
    files.map(async (file, i) => {
      const path = `public/shots/${uid}/${listingId}/${stamp}-${i}${
        ext(file.name) || ".png"
      }`;
      const r = ref(storage, path);
      await uploadBytes(r, file, {
        contentType: file.type || "image/png",
        cacheControl: PUBLIC_ASSET_CACHE,
      });
      return getDownloadURL(r);
    })
  );
}
