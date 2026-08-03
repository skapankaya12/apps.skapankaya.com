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
