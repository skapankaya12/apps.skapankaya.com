/**
 * One-off: replace the department categories with the kind-of-tool set.
 *
 * The browse filters used to be departments (Sales, Marketing, HR...), which
 * read as a B2B catalogue. DEFAULT_CATEGORIES in lib/types.ts now holds the new
 * set. This makes Firestore match it: every category document written with the
 * new label, hint and order, the retired ones deleted, and every listing and
 * /free entry filed under a retired one moved to where it now belongs.
 *
 * Why a script and not /admin/categories: the admin screen can do all of this,
 * but it is twenty-odd clicks per project, and its delete-and-move re-files
 * listings only, not /free entries.
 *
 * A retired category's tools move by MOVES below. A single tool that the
 * mapping would put in the wrong place is moved on its own with --set, by slug:
 *
 *   --set terra-convert-75708=files
 *
 * A listing under a category that is neither in the new set nor in MOVES stops
 * the run before anything is written, so nothing is ever stranded under a
 * filter that no longer exists. Name its destination with --move old=new.
 *
 * Prints the current categories first, as JSON, so the old set can be put back
 * by hand if needed. Dry run unless --apply. Run against ONE project at a time,
 * and check which one: there is no .firebaserc in this repo on purpose.
 *
 *   npx tsx --env-file=.env.local scripts/migrate-categories.ts
 *   npx tsx --env-file=.env.local scripts/migrate-categories.ts --apply
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, type DocumentReference } from "firebase-admin/firestore";
import { DEFAULT_CATEGORIES } from "../lib/types";

/** Where each retired category's tools go. */
const MOVES: Record<string, string> = {
  sales: "growth",
  marketing: "growth",
  operations: "data",
  people: "finance",
  productivity: "desktop",
  personal: "home",
  // Added by hand in /admin/categories on production before this existed.
  "learning-and-development": "learning",
};

const apply = process.argv.includes("--apply");

/** Every value after a repeated flag: --set a=b --set c=d → ["a=b", "c=d"]. */
function flagValues(flag: string): [string, string][] {
  const out: [string, string][] = [];
  process.argv.forEach((arg, i) => {
    if (arg !== flag) return;
    const [from, to] = (process.argv[i + 1] ?? "").split("=");
    if (!from || !to) {
      console.error(`${flag} needs a value like ${flag} old=new`);
      process.exit(1);
    }
    out.push([from, to]);
  });
  return out;
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing env. Need FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL\n" +
      "and FIREBASE_ADMIN_PRIVATE_KEY.\n" +
      "Try: npx tsx --env-file=.env.local scripts/migrate-categories.ts"
  );
  process.exit(1);
}

async function main() {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const db = getFirestore();
  console.log(`${apply ? "" : "[dry run] "}project ${projectId}\n`);

  const target = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
  const moves = { ...MOVES, ...Object.fromEntries(flagValues("--move")) };
  const bySlug = new Map(flagValues("--set"));

  for (const [slug, to] of bySlug) {
    if (!target.has(to)) {
      console.error(`--set ${slug}=${to}: "${to}" is not in the new set.`);
      process.exit(1);
    }
  }
  for (const [from, to] of Object.entries(moves)) {
    if (!target.has(to)) {
      console.error(`Move ${from} → ${to}: "${to}" is not in the new set.`);
      process.exit(1);
    }
  }

  const [categories, listings, freeTools] = await Promise.all([
    db.collection("categories").get(),
    db.collection("listings").get(),
    db.collection("freeTools").get(),
  ]);

  console.log("Current categories (keep this to restore by hand):");
  console.log(
    JSON.stringify(
      categories.docs.map((d) => ({ id: d.id, ...d.data() })),
      null,
      2
    )
  );
  console.log();

  // Work out every re-filing before writing anything.
  type Refile = { ref: DocumentReference; label: string; from: string; to: string };
  const refiles: Refile[] = [];
  const stranded: string[] = [];
  const unusedSets = new Set(bySlug.keys());

  for (const doc of listings.docs) {
    const d = doc.data();
    const from = String(d.category ?? "");
    const slug = String(d.slug ?? "");
    let to = from;
    if (bySlug.has(slug)) {
      to = bySlug.get(slug)!;
      unusedSets.delete(slug);
    } else if (!target.has(from)) {
      if (moves[from]) to = moves[from];
      else stranded.push(`listing "${d.title}" (${slug}) is under "${from}"`);
    }
    if (to !== from) {
      refiles.push({ ref: doc.ref, label: `listing "${d.title}" [${d.status}]`, from, to });
    }
  }
  for (const doc of freeTools.docs) {
    const d = doc.data();
    const from = String(d.category ?? "");
    if (target.has(from)) continue;
    if (moves[from]) {
      refiles.push({ ref: doc.ref, label: `free tool "${d.title}" [${d.status}]`, from, to: moves[from] });
    } else {
      stranded.push(`free tool "${d.title}" is under "${from}"`);
    }
  }

  if (unusedSets.size > 0) {
    console.error(`No listing has the slug: ${[...unusedSets].join(", ")}`);
    process.exit(1);
  }
  if (stranded.length > 0) {
    console.error("These are under a category with nowhere to go. Add --move old=new:");
    stranded.forEach((s) => console.error(`  ${s}`));
    process.exit(1);
  }

  const retired = categories.docs.filter((d) => !target.has(d.id));
  const existing = new Map(categories.docs.map((d) => [d.id, d.data()]));
  // An empty collection means nobody has edited the filters on this project,
  // so it already browses off DEFAULT_CATEGORIES in code. Writing them would
  // only freeze today's list into data that the next code change then misses.
  const writeCategories = !categories.empty;

  console.log("Categories to write:");
  if (!writeCategories) {
    console.log("  none: the collection is empty, so this project already uses the new set from code");
  }
  for (const c of writeCategories ? DEFAULT_CATEGORIES : []) {
    const was = existing.get(c.id);
    console.log(
      `  ${c.id.padEnd(12)} ${c.label}${was ? (was.label !== c.label ? `  (was "${was.label}")` : "") : "  (new)"}`
    );
  }
  console.log("\nCategories to delete:");
  retired.forEach((d) => console.log(`  ${d.id.padEnd(12)} ${d.data().label}`));
  if (retired.length === 0) console.log("  none");
  console.log("\nRe-filed:");
  refiles.forEach((r) => console.log(`  ${r.label}: ${r.from} → ${r.to}`));
  if (refiles.length === 0) console.log("  none");

  if (!apply) {
    console.log("\nDry run. Nothing written. Add --apply to write it.");
    return;
  }

  // One batch: at most a dozen categories, a handful of deletes and every
  // listing, well under Firestore's 500 writes. All or nothing, so a failure
  // cannot leave a tool filed under a category that was already deleted.
  const now = Date.now();
  const batch = db.batch();
  for (const { id, ...rest } of writeCategories ? DEFAULT_CATEGORIES : []) {
    batch.set(db.collection("categories").doc(id), {
      ...rest,
      createdAt: existing.get(id)?.createdAt ?? now,
      updatedAt: now,
    });
  }
  retired.forEach((d) => batch.delete(d.ref));
  refiles.forEach((r) => batch.update(r.ref, { category: r.to, updatedAt: now }));
  await batch.commit();

  console.log(
    `\nDone. ${writeCategories ? DEFAULT_CATEGORIES.length : 0} written, ${retired.length} deleted, ${refiles.length} re-filed.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
