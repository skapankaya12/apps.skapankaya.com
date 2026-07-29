"use client";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";

/* ---------------------------------------------------------------------------
   Client-side uploads to Firebase Storage.

   Three kinds of files, matching the paths in storage.rules:

   - The app package (.zip) → submissions/{listingId}.zip. Private: nobody reads
     it from the client. After a purchase, the server mints a short-lived signed
     URL (see app/api/download). We keep the raw path.
   - Demo video + screenshots → public/… . These are marketing assets shown on
     the listing page to everyone, so they get a permanent public download URL.

   Uploads are keyed by the listing id, which we reserve before writing the
   Firestore doc (see reserveListingId in lib/store), so a listing carries its
   media from the moment it's created — no empty-then-patch window.
--------------------------------------------------------------------------- */

const storage = getStorage(app);

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
  listingId: string,
  file: File
): Promise<string> {
  const path = `submissions/${listingId}.zip`;
  await uploadBytes(ref(storage, path), file, {
    contentType: file.type || "application/zip",
  });
  return path;
}

/** Upload the demo video to the public bucket; returns its public URL. */
export async function uploadDemoVideo(
  listingId: string,
  file: File
): Promise<string> {
  const path = `public/demos/${listingId}${ext(file.name) || ".mp4"}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || "video/mp4" });
  return getDownloadURL(r);
}

/** Upload screenshots to the public bucket; returns their public URLs in order. */
export async function uploadScreenshots(
  listingId: string,
  files: File[]
): Promise<string[]> {
  return Promise.all(
    files.map(async (file, i) => {
      const path = `public/shots/${listingId}/${i}${ext(file.name) || ".png"}`;
      const r = ref(storage, path);
      await uploadBytes(r, file, { contentType: file.type || "image/png" });
      return getDownloadURL(r);
    })
  );
}
