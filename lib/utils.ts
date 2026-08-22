import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Return a seller-supplied link only if it's a real https:// URL.
 *
 * Everything a seller types ends up in an `href` on a page we host, so a
 * `javascript:` or `data:` value would run in our origin, and a bare `http://`
 * link is a mixed-content downgrade. Anything that isn't plain https comes back
 * undefined, and the caller renders nothing rather than a hostile link.
 */
export function safeHttpsUrl(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * True when a `Listing.screenshots` entry is a renderable image and not a label.
 *
 * The field is a mixed bag by design (see the type): production listings store
 * Storage URLs, while seed and older listings store plain text like
 * "Before / after cleanup". Only the URLs can go in an `<img>`.
 */
export function isImageSrc(src: string): boolean {
  return /^https?:\/\//.test(src) || src.startsWith("/");
}

/**
 * The first screenshot that is a real image, used as the poster frame for a
 * listing's demo video. A demo is a big file in a container the browser may not
 * even decode, so without a poster the video is a black rectangle — which is
 * all a phone ever shows, since nothing there can hover to start playback.
 */
export function firstScreenshot(screenshots?: string[]): string | undefined {
  return screenshots?.find(isImageSrc);
}
