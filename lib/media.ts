import { INSTALLER_EXTENSIONS, type SetupMode } from "./types";

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
 * Installers get more room than source packages.
 *
 * A zipped script is small because it is text. A native app carries frameworks,
 * universal binaries and assets, and a signed Mac DMG routinely passes 200MB
 * without anything being wrong with it. Keep the tighter limit where it still
 * means something.
 */
export const MAX_INSTALLER_BYTES = 500 * 1024 * 1024;

/** The cap that applies to a package, given how the tool is set up. */
export function maxPackageBytes(setupMode: SetupMode): number {
  return setupMode === "installer" ? MAX_INSTALLER_BYTES : MAX_PACKAGE_BYTES;
}

/** What the file picker should offer, given how the tool is set up. */
export function packageAccept(setupMode: SetupMode): string {
  return setupMode === "installer" ? INSTALLER_EXTENSIONS.join(",") : ".zip";
}

/**
 * Check a chosen package before anyone waits on an upload. Returns the message
 * to show, or null when the file is fine.
 */
export function validatePackage(file: File, setupMode: SetupMode): string | null {
  const cap = maxPackageBytes(setupMode);
  const capMb = Math.round(cap / (1024 * 1024));
  const wantsInstaller = setupMode === "installer";
  const name = file.name.toLowerCase();

  if (wantsInstaller && !INSTALLER_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Installers must be a .dmg right now. Mac is the only format we can verify, so it is the only one we accept.";
  }
  if (!wantsInstaller && !name.endsWith(".zip")) {
    return "That needs to be a .zip. If you are selling a native app, pick Installer as the setup method.";
  }
  if (file.size > cap) {
    return `That file is over the ${capMb}MB limit.`;
  }
  return null;
}

/** The extension a package is stored under, derived from the file itself. */
export function packageExtension(file: File): string {
  const match = /\.[a-z0-9]+$/i.exec(file.name);
  return (match?.[0] ?? ".zip").toLowerCase();
}

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

/**
 * Grab a still frame from a demo video, to use as its poster.
 *
 * The poster used to be the listing's first screenshot, which quietly rots:
 * replace the demo and the card keeps showing a frame of the old recording
 * until someone hovers, because the screenshot is a separate file nobody
 * thought to update. A frame cut from the video itself can't drift out of sync
 * with it.
 *
 * Returns null rather than throwing if the browser can't decode the file — the
 * caller falls back to the first screenshot, which is where we started.
 */
export async function captureVideoPoster(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await once(video, "loadeddata");
    // Not frame 0: recordings routinely open on a fade-in, a blank editor or a
    // desktop, and a poster of nothing sells nothing. A moment in is
    // representative without being arbitrary.
    const target = Math.min(1, (Number.isFinite(video.duration) ? video.duration : 2) / 10);
    video.currentTime = target;
    await once(video, "seeked");

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;

    // Capped at 1280 wide: this is a poster behind a 288px card and a
    // ~700px stage, and a retina capture is pointlessly heavy for both.
    const scale = Math.min(1, 1280 / width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // JPEG, not PNG: a screen recording frame is a photograph as far as the
    // encoder is concerned, and the PNG screenshots sellers upload run to 1MB+.
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
    video.src = "";
  }
}

/** Resolve on an event, reject on error, so the steps above can be awaited. */
function once(el: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error(`video ${event} failed`));
    };
    const cleanup = () => {
      el.removeEventListener(event, ok);
      el.removeEventListener("error", fail);
    };
    el.addEventListener(event, ok, { once: true });
    el.addEventListener("error", fail, { once: true });
  });
}
