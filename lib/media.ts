/* ---------------------------------------------------------------------------
   Rules about the files a listing carries, in one place.

   These are mirrored in storage.rules — raising a limit here without raising it
   there just moves the failure from a friendly message to a raw 403. Both the
   seller submit form and the admin edit form validate through `validateDemo`,
   so a rule can't hold on one surface and not the other.
--------------------------------------------------------------------------- */

/**
 * The demo ceiling is deliberately far above what a good demo weighs: an
 * unedited screen recording is wildly inefficient (a 40s retina capture can
 * pass 100MB) and we'd rather accept it than lose the listing. The forms nudge
 * toward something small — the cap is a backstop, not a target.
 */
export const MAX_DEMO_BYTES = 150 * 1024 * 1024;
export const MAX_DEMO_SECONDS = 40;
export const MAX_PACKAGE_BYTES = 200 * 1024 * 1024;

/**
 * True for a QuickTime container. Checked by both MIME type and extension: a
 * .mov dragged in from Finder usually carries video/quicktime, but a file that
 * has travelled through a zip or a download can arrive with an empty type.
 */
export function isQuickTime(file: File): boolean {
  return file.type === "video/quicktime" || /\.mov$/i.test(file.name);
}

/** Read a video file's duration (seconds) from its metadata, without playing it. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = v.duration;
      URL.revokeObjectURL(v.src);
      resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(v.src);
      reject(new Error("cannot read video metadata"));
    };
    v.src = URL.createObjectURL(file);
  });
}

/**
 * Check a demo video before anyone waits on an upload. Returns the message to
 * show, or null when the file is fine.
 */
export async function validateDemo(file: File): Promise<string | null> {
  if (file.size > MAX_DEMO_BYTES) {
    return "That video is over 150MB. Export it smaller rather than shorter — 1080p is plenty.";
  }
  // A QuickTime .mov plays fine on the Mac it was recorded on and nowhere else
  // reliably — Chrome reports it can't play video/quicktime at all, so buyers
  // on Android get a demo that never starts. Catch it at upload, where it can
  // still be re-exported, rather than on the listing page months later.
  if (isQuickTime(file)) {
    return "That's a QuickTime .mov, which many browsers can't play. Export it as MP4 (H.264) — QuickTime Player, iMovie and every screen recorder can, and buyers on Android won't see it otherwise.";
  }
  let duration: number | null = null;
  try {
    duration = await readVideoDuration(file);
  } catch {
    duration = null; // couldn't read metadata; fall through and allow it
  }
  if (duration !== null && duration > MAX_DEMO_SECONDS + 1) {
    return `Demo videos must be ${MAX_DEMO_SECONDS} seconds or shorter (this one is ${Math.round(duration)}s).`;
  }
  return null;
}
