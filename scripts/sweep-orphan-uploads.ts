/**
 * Delete uploaded files that no Firestore document references any more.
 *
 * Replacing an avatar, a screenshot or a demo does not overwrite the old file:
 * it writes a new one at a new path, because the public assets are served
 * `immutable` for a year and overwriting bytes at a URL a browser has already
 * cached is unfixable. The old object is the price of that, and nothing has
 * ever cleaned it up. On staging in August, 61% of the bucket was unreferenced
 * with two listings in it.
 *
 * Two safety rules, both load-bearing:
 *
 * 1. GRACE PERIOD. An object is only deleted once it has been unreferenced for
 *    longer than --days (default 7). Listing pages are server-rendered and
 *    cached for five minutes, so a page holding the old URL can still be served
 *    for a little while after the document stopped pointing at it. Seven days
 *    covers that with absurd margin and also gives a seller who replaced the
 *    wrong file a week to notice.
 *
 * 2. REFERENCES ARE READ FIRST, AND A READ FAILURE ABORTS. If the listing scan
 *    fails halfway, the reference set is short and everything missing from it
 *    looks like garbage. Deleting on a partial read would wipe the live
 *    catalogue's media, so it does not run at all unless every collection read
 *    succeeded.
 *
 * `submissions/` is included but is nearly always empty of orphans by design:
 * uploadPackage writes to a fixed path per listing, so a re-upload overwrites
 * rather than accumulating. What turns up there is packages belonging to
 * listings that no longer exist.
 *
 * Safe to re-run. Run against ONE project at a time, and check which one: there
 * is no .firebaserc in this repo on purpose, to stop cross-environment mistakes.
 *
 *   npx tsx --env-file=.env.local scripts/sweep-orphan-uploads.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/sweep-orphan-uploads.ts
 *   npx tsx --env-file=.env.local scripts/sweep-orphan-uploads.ts --days 30
 *
 * For production, point the FIREBASE_ADMIN_* / NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * vars at the prod project (e.g. --env-file=.env.production.local).
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";

/** Everything the sweep is allowed to look at. Anything else is left alone. */
const PREFIXES = [
  "public/demos/",
  "public/shots/",
  "public/avatars/",
  "submissions/",
];

const dryRun = process.argv.includes("--dry-run");

const daysFlag = process.argv.indexOf("--days");
const graceDays =
  daysFlag > -1 ? Number(process.argv[daysFlag + 1]) : 7;

if (!Number.isFinite(graceDays) || graceDays < 0) {
  console.error("--days must be a non-negative number.");
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

if (!projectId || !clientEmail || !privateKey || !bucketName) {
  console.error(
    "Missing env. Need FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,\n" +
      "FIREBASE_ADMIN_PRIVATE_KEY and NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.\n" +
      "Try: npx tsx --env-file=.env.local scripts/sweep-orphan-uploads.ts --dry-run"
  );
  process.exit(1);
}

/**
 * The object path inside a stored reference.
 *
 * Public assets are stored as download URLs, which carry the path URL-encoded
 * after `/o/`. Packages are stored as the bare path already.
 */
function objectPath(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const inUrl = value.match(/\/o\/([^?]+)/);
  if (inUrl) return decodeURIComponent(inUrl[1]);
  return value.startsWith("submissions/") ? value : null;
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

async function collectReferences(): Promise<Set<string>> {
  const db = getFirestore();
  const referenced = new Set<string>();

  // Every listing, whatever its status. A rejected or unlisted listing still
  // owns its files: an unlisted one is still downloadable by people who bought
  // it, and a rejected one can be fixed and resubmitted.
  const listings = await db.collection("listings").get();
  for (const doc of listings.docs) {
    const l = doc.data();
    for (const value of [l.packagePath, l.demoVideo, l.posterImage]) {
      const path = objectPath(value);
      if (path) referenced.add(path);
    }
    for (const shot of (l.screenshots as unknown[]) ?? []) {
      const path = objectPath(shot);
      if (path) referenced.add(path);
    }
  }

  const users = await db.collection("users").get();
  for (const doc of users.docs) {
    const path = objectPath(doc.data().avatarUrl);
    if (path) referenced.add(path);
  }

  console.log(
    `${listings.size} listing(s), ${users.size} user(s) → ${referenced.size} referenced object(s)`
  );
  if (listings.empty) {
    // A catalogue that reads as empty is far more likely to be a broken query
    // or the wrong project than a marketplace with nothing in it. Refuse.
    throw new Error(
      "No listings found. Refusing to sweep: every file would look unreferenced."
    );
  }
  return referenced;
}

async function main() {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

  console.log(
    `${dryRun ? "[dry run] " : ""}project ${projectId} · bucket ${bucketName}` +
      ` · grace ${graceDays} day(s)\n`
  );

  // Read the references BEFORE listing the bucket, and let a failure here stop
  // the whole run. See rule 2 at the top of this file.
  const referenced = await collectReferences();

  const cutoff = Date.now() - graceDays * 24 * 60 * 60 * 1000;
  const bucket = getStorage().bucket(bucketName);

  let seen = 0;
  let deleted = 0;
  let deletedBytes = 0;
  let waiting = 0;

  for (const prefix of PREFIXES) {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      seen += 1;
      if (referenced.has(file.name)) continue;

      const size = Number(file.metadata.size ?? 0);
      // updated, not created: replacing an object's metadata (the cache-control
      // backfill did exactly that) touches this, and a file we rewrote last
      // week is not one we should be deleting today.
      const updated = Date.parse(file.metadata.updated ?? "") || 0;
      if (updated > cutoff) {
        const age = ((Date.now() - updated) / 86400000).toFixed(1);
        console.log(`  wait    ${file.name}  (${mb(size)}, ${age}d old)`);
        waiting += 1;
        continue;
      }

      console.log(`  ${dryRun ? "would  " : "delete "} ${file.name}  (${mb(size)})`);
      if (!dryRun) await file.delete();
      deleted += 1;
      deletedBytes += size;
    }
  }

  console.log(
    `\n${seen} object(s) seen · ${deleted} ${
      dryRun ? "would be " : ""
    }deleted (${mb(deletedBytes)}) · ${waiting} unreferenced but inside the grace period.`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
