"use client";

import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  type StorageReference,
  type UploadMetadata,
} from "firebase/storage";
import { app } from "./firebase";
import { packageExtension } from "./media";

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

/**
 * How far along an upload is, from 0 to 1.
 *
 * Passed in by the seller form, which shows a bar per file. A package can be
 * 500MB, which on a home connection is minutes of waiting, and the form used to
 * spend that time on a button that said "Uploading…" and nothing else.
 */
export type ProgressFn = (fraction: number) => void;

/**
 * Write bytes, reporting progress when anyone is listening.
 *
 * Falls back to the plain one-shot upload without a callback, because
 * uploadBytesResumable negotiates a session before it sends anything and there
 * is no reason to pay for that on a 40KB screenshot nobody is watching.
 */
async function put(
  r: StorageReference,
  data: Blob | File,
  metadata: UploadMetadata,
  onProgress?: ProgressFn
): Promise<void> {
  if (!onProgress) {
    await uploadBytes(r, data, metadata);
    return;
  }
  const task = uploadBytesResumable(r, data, metadata);
  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) =>
        onProgress(
          snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0
        ),
      reject,
      resolve
    );
  });
}

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
  file: File,
  onProgress?: ProgressFn
): Promise<string> {
  // The extension comes from the file, because a .dmg and a .zip are both
  // legitimate packages now and the stored path is what the download route
  // hands back to a buyer. storage.rules matches on the folder, not the name,
  // so widening this does not widen who can write there.
  const ext = packageExtension(file);
  const path = `submissions/${uid}/${listingId}${ext}`;
  await put(
    ref(storage, path),
    file,
    {
      contentType:
        file.type ||
        (ext === ".dmg" ? "application/x-apple-diskimage" : "application/zip"),
    },
    onProgress
  );
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
  file: File,
  onProgress?: ProgressFn
): Promise<string> {
  const path = `public/demos/${uid}/${listingId}-${Date.now()}${
    ext(file.name) || ".mp4"
  }`;
  const r = ref(storage, path);
  await put(
    r,
    file,
    { contentType: file.type || "video/mp4", cacheControl: PUBLIC_ASSET_CACHE },
    onProgress
  );
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

/**
 * Upload one screenshot to the public bucket; returns its public URL.
 *
 * Single-file because the seller form now sends each shot the moment it is
 * chosen, so it can show which ones have landed rather than blocking on the
 * whole set. `stamp` keeps the old guarantee: a unique filename per upload, so
 * re-submitting never overwrites a screenshot the seller chose to keep.
 */
export async function uploadScreenshot(
  uid: string,
  listingId: string,
  file: File,
  onProgress?: ProgressFn
): Promise<string> {
  const path = `public/shots/${uid}/${listingId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}${ext(file.name) || ".png"}`;
  const r = ref(storage, path);
  await put(
    r,
    file,
    {
      contentType: file.type || "image/png",
      cacheControl: PUBLIC_ASSET_CACHE,
    },
    onProgress
  );
  return getDownloadURL(r);
}

/** Upload screenshots to the public bucket; returns their public URLs in order. */
export async function uploadScreenshots(
  uid: string,
  listingId: string,
  files: File[]
): Promise<string[]> {
  return Promise.all(files.map((file) => uploadScreenshot(uid, listingId, file)));
}


/**
 * Upload a seller's avatar. Returns the public URL to store on their user doc.
 *
 * Timestamped like the screenshots, and for the same reason: the public assets
 * carry an immutable cache header, so replacing a face has to produce a new URL
 * rather than new bytes at the old one. Otherwise a seller changes their photo
 * and keeps seeing the old one for a year.
 */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const path = `public/avatars/${uid}/${Date.now()}${ext(file.name) || ".png"}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, {
    contentType: file.type || "image/png",
    cacheControl: PUBLIC_ASSET_CACHE,
  });
  return getDownloadURL(r);
}
