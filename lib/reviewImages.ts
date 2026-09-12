/**
 * Which image URLs a review note may show.
 *
 * A note is written by an admin, but it is rendered on the seller's dashboard
 * and inside an email, so an image in it is only shown when it is one the
 * note editor uploaded: our own bucket, under public/review/. Anything else
 * (a pasted link to another site, a tracking pixel) renders as nothing. The
 * editor never produces anything else, so the check only ever bites on text
 * written by hand.
 *
 * Firebase download URLs look like
 *   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/public%2Freview%2F<uid>%2F...?alt=media&token=...
 * with the object path URL-encoded as one segment.
 */
export function isReviewImageUrl(src: string): boolean {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return (
    url.protocol === "https:" &&
    url.hostname === "firebasestorage.googleapis.com" &&
    Boolean(bucket) &&
    url.pathname.startsWith(`/v0/b/${bucket}/o/public%2Freview%2F`)
  );
}
