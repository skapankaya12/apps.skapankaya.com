/**
 * One-off: put a real Cache-Control on the public marketing assets already in
 * Storage.
 *
 * lib/storage.ts sets this on upload now, but that only helps files uploaded
 * from here on. Everything uploaded before it still carries Firebase's default
 * `private, max-age=0`, so every demo video is re-downloaded on every visit —
 * tens of megabytes a page, for files that never change.
 *
 * Safe to re-run: it only rewrites objects whose cacheControl doesn't already
 * match, and it never touches `submissions/` (paid packages, served through
 * short-lived signed URLs and deliberately uncacheable).
 *
 * Run against ONE project at a time, and check which one — there is no
 * .firebaserc in this repo on purpose, to stop cross-environment mistakes:
 *
 *   npx tsx --env-file=.env.local scripts/backfill-asset-cache.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-asset-cache.ts
 *
 * For production, point the FIREBASE_ADMIN_* / NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * vars at the prod project (e.g. --env-file=.env.production.local).
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const CACHE_CONTROL = "public, max-age=31536000, immutable";
/** Only the world-readable marketing assets. Never `submissions/`. */
const PREFIXES = ["public/demos/", "public/shots/"];

const dryRun = process.argv.includes("--dry-run");

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

if (!projectId || !clientEmail || !privateKey || !bucketName) {
  console.error(
    "Missing env. Need FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,\n" +
      "FIREBASE_ADMIN_PRIVATE_KEY and NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.\n" +
      "Try: npx tsx --env-file=.env.local scripts/backfill-asset-cache.ts --dry-run"
  );
  process.exit(1);
}

async function main() {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const bucket = getStorage().bucket(bucketName);

  console.log(
    `${dryRun ? "[dry run] " : ""}project ${projectId} · bucket ${bucketName}\n`
  );

  let seen = 0;
  let changed = 0;

  for (const prefix of PREFIXES) {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      seen += 1;
      const current = file.metadata.cacheControl;
      if (current === CACHE_CONTROL) {
        console.log(`  ok      ${file.name}`);
        continue;
      }
      const size = Number(file.metadata.size ?? 0);
      const mb = (size / 1024 / 1024).toFixed(1);
      console.log(
        `  ${dryRun ? "would  " : "update "} ${file.name}  (${mb}MB, was: ${
          current ?? "unset"
        })`
      );
      if (!dryRun) await file.setMetadata({ cacheControl: CACHE_CONTROL });
      changed += 1;
    }
  }

  console.log(
    `\n${seen} object(s) seen, ${changed} ${dryRun ? "would be " : ""}updated.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
