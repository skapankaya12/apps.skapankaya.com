/**
 * Check a native installer's Apple signature, and record the verdict.
 *
 * Source packages get reviewed by reading them. An installer cannot be read, so
 * the check is what Apple already knows about it: a Developer ID signature and
 * a stapled notarization ticket. This is the substitute for source review on
 * `setupMode: "installer"` listings, and approval should wait on it.
 *
 * MUST RUN ON macOS. `codesign`, `spctl` and `stapler` are macOS binaries, so
 * this cannot run on Vercel or in a Linux CI container. That is the whole
 * reason it is a script rather than an API route. A macOS GitHub Actions runner
 * can call it unattended later; until then the admin runs it during review.
 *
 * Run against ONE project at a time, and check which one. There is no
 * .firebaserc in this repo on purpose, to stop cross-environment mistakes:
 *
 *   npx tsx --env-file=.env.local scripts/verify-package.ts <listingId>
 *   npx tsx --env-file=.env.local scripts/verify-package.ts <listingId> --dry-run
 *
 * A pass means Apple found no known malware and the signature is intact. It is
 * NOT a statement that the app is good, does what it claims, or is worth the
 * money. Do not let the buyer copy imply otherwise.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = promisify(execFile);

const listingId = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!listingId || listingId.startsWith("--")) {
  console.error("Usage: verify-package.ts <listingId> [--dry-run]");
  process.exit(1);
}

if (process.platform !== "darwin") {
  console.error(
    "This has to run on macOS: codesign, spctl and stapler ship with Xcode and\n" +
      "exist nowhere else. Run it on the admin's Mac, or on a macos-latest runner."
  );
  process.exit(1);
}

/**
 * Run a checker and return its combined output.
 *
 * Every one of these signals failure with a non-zero exit, and `codesign`
 * writes its actual findings to stderr even when it succeeds, so both streams
 * are kept and the throw is caught rather than propagated.
 */
async function check(
  cmd: string,
  args: string[]
): Promise<{ ok: boolean; out: string }> {
  try {
    const { stdout, stderr } = await run(cmd, args, { timeout: 120_000 });
    return { ok: true, out: `${stdout}${stderr}`.trim() };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      out: `${e.stdout ?? ""}${e.stderr ?? ""}`.trim() || e.message || "failed",
    };
  }
}

function firstMatch(text: string, re: RegExp): string | undefined {
  return re.exec(text)?.[1]?.trim();
}

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!projectId || !bucketName) {
    console.error("Missing FIREBASE_ADMIN_PROJECT_ID / NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.");
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
      storageBucket: bucketName,
    });
  }

  console.log(`Project: ${projectId}\nBucket:  ${bucketName}\n`);

  const db = getFirestore();
  const ref = db.collection("listings").doc(listingId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`No listing ${listingId} in ${projectId}.`);
    process.exit(1);
  }

  const listing = snap.data() as {
    title?: string;
    setupMode?: string;
    packagePath?: string;
  };

  console.log(`Listing: ${listing.title ?? "(untitled)"}  [${listing.setupMode}]`);

  if (listing.setupMode !== "installer") {
    console.log("\nNot an installer, so there is no signature to check. Review the source instead.");
    return;
  }
  if (!listing.packagePath) {
    console.error("\nNo packagePath on this listing.");
    process.exit(1);
  }

  const dir = await mkdtemp(join(tmpdir(), "solomarket-verify-"));
  const local = join(dir, listing.packagePath.split("/").pop() ?? "package.dmg");

  try {
    console.log(`\nDownloading ${listing.packagePath} ...`);
    await getStorage().bucket(bucketName).file(listing.packagePath).download({ destination: local });

    // The three questions, in the order that makes a verdict readable:
    // is it signed, who signed it, and did Apple notarize this exact file.
    console.log("Running codesign, spctl and stapler ...\n");
    const sig = await check("codesign", ["-dv", "--verbose=4", local]);
    const gate = await check("spctl", [
      "-a",
      "-t",
      "open",
      "--context",
      "context:primary-signature",
      "-v",
      local,
    ]);
    const ticket = await check("xcrun", ["stapler", "validate", local]);

    const authority = firstMatch(sig.out, /Authority=(.+)/);
    const teamId = firstMatch(sig.out, /TeamIdentifier=([A-Z0-9]+)/i);

    const failures: string[] = [];
    if (!sig.ok) failures.push("not signed, or the signature is broken");
    if (!gate.ok) failures.push("Gatekeeper rejected it");
    if (!ticket.ok) failures.push("no stapled notarization ticket");

    const status: "pass" | "fail" = failures.length === 0 ? "pass" : "fail";

    console.log(`  signature : ${sig.ok ? "ok" : "FAILED"}${authority ? `  (${authority})` : ""}`);
    console.log(`  gatekeeper: ${gate.ok ? "accepted" : "REJECTED"}`);
    console.log(`  notarized : ${ticket.ok ? "ticket stapled" : "NO TICKET"}`);
    if (teamId) console.log(`  team id   : ${teamId}`);
    console.log(`\n  VERDICT: ${status.toUpperCase()}${failures.length ? ` (${failures.join("; ")})` : ""}`);

    if (status === "fail") {
      console.log("\n  Full output:\n" + [sig.out, gate.out, ticket.out].join("\n---\n"));
    }

    if (dryRun) {
      console.log("\n--dry-run, nothing written.");
      return;
    }

    // packagePath is stored with the verdict on purpose: a seller who re-uploads
    // gets a new path, which makes a stale pass visibly stale rather than
    // silently vouching for a file nobody checked.
    await ref.update({
      packageVerification: {
        status,
        checkedAt: Date.now(),
        packagePath: listing.packagePath,
        ...(teamId ? { teamId } : {}),
        ...(authority ? { authority } : {}),
        ...(failures.length ? { detail: failures.join("; ") } : {}),
      },
    });
    console.log(`\nWritten to listings/${listingId}.`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
