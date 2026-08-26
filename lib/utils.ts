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
 * The first screenshot that is a real image.
 *
 * Only a fallback for the poster now — see listingPoster. A demo is a big file
 * in a container the browser may not even decode, so without a poster the video
 * is a black rectangle, which is all a phone ever shows since nothing there can
 * hover to start playback.
 */
export function firstScreenshot(screenshots?: string[]): string | undefined {
  return screenshots?.find(isImageSrc);
}

/**
 * The still to show before a listing's demo plays.
 *
 * Prefers the frame cut from the video at upload, because that one cannot
 * disagree with what plays. The first screenshot is the fallback, for listings
 * uploaded before posters existed and for demos whose frame couldn't be
 * decoded — and it is exactly the case that made this function necessary:
 * replacing a demo left the old recording's frame on the card, since the
 * screenshot is a separate file nobody thought to replace.
 */
export function listingPoster(listing: {
  posterImage?: string;
  screenshots?: string[];
}): string | undefined {
  return listing.posterImage || firstScreenshot(listing.screenshots);
}

/**
 * The host a link points at, for display beside an outbound link.
 *
 * Lives here rather than next to the /free reads because it is pure and both
 * sides need it: the card renders on the server, the review queue in the
 * browser. Importing it from a `.server` module dragged the Firebase Admin SDK
 * into the client bundle and broke the build outright.
 *
 * Falls back to the raw string rather than throwing. A malformed URL should
 * make one card look wrong, not take the page down.
 */
export function linkHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
