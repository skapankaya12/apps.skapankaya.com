/**
 * Seller handles: the public name in /seller/{handle}.
 *
 * A handle is a piece of identity a buyer can bookmark and a seller can print
 * on their own site, so the rules here are conservative on purpose. Everything
 * in this file is pure, so the seller form, the API routes and the security
 * rules documentation all agree on what a valid handle is without importing
 * Firebase.
 */

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;

/**
 * Names nobody may register.
 *
 * Profiles live under /seller/{handle} rather than at the root precisely so a
 * new route can never collide with an existing seller. That makes this list
 * short: it is about impersonation, not routing. Someone registering "support"
 * or "admin" and then messaging buyers is the thing being prevented.
 */
const RESERVED = new Set([
  "admin",
  "administrator",
  "api",
  "billing",
  "help",
  "info",
  "moderator",
  "new",
  "official",
  "owner",
  "payments",
  "root",
  "security",
  "settings",
  "solomarket",
  "staff",
  "support",
  "system",
  "team",
  "thesolomarket",
  "www",
]);

/**
 * Best-effort handle from whatever the seller called themselves.
 *
 * Only ever a starting suggestion: the caller shows it, the seller edits it,
 * and claimHandle() is what actually decides. Returns "" when there's nothing
 * usable left (a display name that is entirely emoji, say), and the caller
 * treats that as "ask them to type one".
 */
export function suggestHandle(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .normalize("NFKD")
    // Strip combining marks so "João" suggests "joao" rather than losing the
    // letter entirely to the non-alphanumeric rule below.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, HANDLE_MAX)
    .replace(/-+$/g, "");
  return base.length >= HANDLE_MIN ? base : "";
}

/** Handles are compared and stored lowercase; display name carries the styling. */
export function normalizeHandle(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Why this handle can't be used, or null if it can.
 *
 * Returns a sentence to show the seller, not an error code: this is rendered
 * directly under the field while they type.
 */
export function handleProblem(input: string): string | null {
  const handle = normalizeHandle(input);
  if (!handle) return "Pick a handle.";
  if (handle.length < HANDLE_MIN) return `At least ${HANDLE_MIN} characters.`;
  if (handle.length > HANDLE_MAX) return `At most ${HANDLE_MAX} characters.`;
  if (!/^[a-z0-9-]+$/.test(handle)) return "Letters, numbers and hyphens only.";
  if (handle.startsWith("-") || handle.endsWith("-"))
    return "Can't start or end with a hyphen.";
  if (handle.includes("--")) return "No double hyphens.";
  if (RESERVED.has(handle)) return "That handle is reserved.";
  return null;
}

export function isReservedHandle(input: string): boolean {
  return RESERVED.has(normalizeHandle(input));
}
