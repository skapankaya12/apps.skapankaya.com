/**
 * A seller's X handle.
 *
 * Kept separate from lib/handles.ts on purpose: that file owns the handle we
 * issue and have to keep unique forever, and its rules exist to protect a URL
 * on this site. This one describes somebody else's name on somebody else's
 * platform, so the only job is to accept what a seller is likely to paste and
 * hand back the bare handle.
 *
 * Pure, like lib/handles.ts, so the account form and the avatar route agree on
 * what is valid without either importing the other's dependencies.
 */

/** X's own limit. Fifteen characters, and it has not moved in years. */
export const X_HANDLE_MAX = 15;

/**
 * Pull the handle out of whatever was pasted.
 *
 * Sellers paste three things: the bare handle, "@handle", and the full profile
 * URL copied from the address bar. Both hosts are accepted because x.com links
 * are still served from twitter.com and plenty of people have the old one
 * bookmarked. Query strings are dropped, so a link copied from a tweet's share
 * menu (which carries ?s=20 and friends) still resolves.
 */
export function normalizeXHandle(input: string): string {
  let value = input.trim();
  if (!value) return "";

  // A pasted URL, with or without the scheme. Take the first path segment.
  const url = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (/^(x|twitter)\.com\//i.test(url)) {
    value = url.split("/")[1] ?? "";
  }

  return value.replace(/^@+/, "").split(/[?#/]/)[0].trim();
}

/**
 * Why this X handle can't be used, or null if it can.
 *
 * A sentence to show the seller, matching handleProblem() in lib/handles.ts.
 * Note what this does NOT do: it never checks that the account exists. That
 * answer costs an API call we deliberately don't make (see the avatar route),
 * and a handle that 404s is the seller's own typo to fix, not a reason to
 * block the rest of their profile from saving.
 */
export function xHandleProblem(input: string): string | null {
  const handle = normalizeXHandle(input);
  if (!handle) return "Enter your X handle.";
  if (handle.length > X_HANDLE_MAX)
    return `At most ${X_HANDLE_MAX} characters.`;
  if (!/^[A-Za-z0-9_]+$/.test(handle))
    return "Letters, numbers and underscores only.";
  return null;
}

/** The public profile link, or null when there's nothing usable to link to. */
export function xProfileUrl(handle: string | undefined): string | null {
  if (!handle) return null;
  const clean = normalizeXHandle(handle);
  if (xHandleProblem(clean)) return null;
  return `https://x.com/${clean}`;
}
