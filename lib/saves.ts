/**
 * The one number both sides of the save count agree on.
 *
 * Its own file because the threshold is needed by a client component and the
 * counting lives in lib/saves.server.ts, which pulls in the Admin SDK. Importing
 * that from the browser would drag server credentials into the bundle.
 */

/**
 * Below this, a listing shows no save count at all.
 *
 * A marketplace still seeding its first listings would otherwise print "0
 * saves" under every tool, which is worse than silence: an empty number reads
 * as evidence nobody wanted it, when it really means nobody has been here yet.
 * The seller always sees their true count on their own dashboard.
 */
export const PUBLIC_SAVE_THRESHOLD = 5;
