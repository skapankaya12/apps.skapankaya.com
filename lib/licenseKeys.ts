import type { Listing } from "@/lib/types";
import { safeHttpsUrl } from "@/lib/utils";

/*
  Licence keys, the rules both sides agree on.

  Pure and dependency free, so the seller form can tell someone what is wrong
  with their paste before it is sent and the server can apply exactly the same
  test when it arrives. The Admin SDK half is lib/licenseKeys.server.ts.
*/

/** Longest key accepted. Real keys are tens of characters; this is headroom. */
export const LICENSE_KEY_MAX = 512;
/** Keys accepted in one paste. */
export const LICENSE_KEYS_PER_UPLOAD = 1000;
/** Keys a listing may hold unused at once. */
export const LICENSE_KEYS_STOCK_MAX = 5000;
/** Below this many unused keys the seller is told to add more. */
export const LICENSE_KEYS_LOW = 5;
/** Longest set of instructions shown to a buyer beside their key. */
export const LICENSE_INSTRUCTIONS_MAX = 300;

export interface ParsedKeys {
  /** Distinct, well-formed keys, in the order they were pasted. */
  keys: string[];
  /** Lines that were repeated within the paste and were counted once. */
  duplicates: number;
  /** Lines too long, or holding characters no key contains. */
  invalid: number;
}

/**
 * Split a paste into keys: one per line, trimmed, blank lines ignored.
 *
 * A key is kept exactly as typed apart from the surrounding whitespace. Case
 * is not folded, because plenty of key formats are case-sensitive and a key
 * altered on the way in is a key that will not activate.
 */
export function parseLicenseKeys(text: string): ParsedKeys {
  const seen = new Set<string>();
  const keys: string[] = [];
  let duplicates = 0;
  let invalid = 0;
  for (const raw of text.split(/\r?\n/)) {
    const key = raw.trim();
    if (!key) continue;
    // Control characters never belong in a key and usually mean a paste from a
    // spreadsheet dragged a tab or a stray byte along with it.
    if (key.length > LICENSE_KEY_MAX || /[\x00-\x1f\x7f]/.test(key)) {
      invalid++;
      continue;
    }
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    keys.push(key);
  }
  return { keys, duplicates, invalid };
}

/**
 * The licence fields to write on a listing save.
 *
 * Only writes a field when it means something. Every listing written before
 * licence keys existed has none of these fields, and writing `false` or `""`
 * onto one would count as a change to a reviewed field: the rules would then
 * refuse an ordinary presentation edit of a live tool. So a field that was
 * never set stays unset, and one that was set is cleared explicitly when the
 * seller turns keys off. `undefined` is dropped by the Firestore client.
 */
export function licenseFieldsForWrite(
  input: { needsKey: boolean; instructions: string; redeemUrl: string },
  current?: Pick<Listing, "needsLicenseKey" | "licenseInstructions" | "licenseRedeemUrl">
): Pick<Listing, "needsLicenseKey" | "licenseInstructions" | "licenseRedeemUrl"> {
  if (input.needsKey) {
    const url = safeHttpsUrl(input.redeemUrl);
    return {
      needsLicenseKey: true,
      licenseInstructions: input.instructions.trim().slice(0, LICENSE_INSTRUCTIONS_MAX),
      licenseRedeemUrl: url ?? (current?.licenseRedeemUrl ? "" : undefined),
    };
  }
  return {
    needsLicenseKey: current?.needsLicenseKey ? false : undefined,
    licenseInstructions: current?.licenseInstructions ? "" : undefined,
    licenseRedeemUrl: current?.licenseRedeemUrl ? "" : undefined,
  };
}
