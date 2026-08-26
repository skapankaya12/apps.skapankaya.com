/**
 * Fail the build if firestore.rules and lib/types.ts disagree about which
 * fields send a listing back for review.
 *
 * REVIEW_CRITICAL_FIELDS decides what the seller form tells someone is about to
 * happen. The matching list inside reviewedPartsIntact() in firestore.rules is
 * what actually stops the write. Security rules cannot import TypeScript, so
 * the list genuinely exists twice, and the two drifting apart is silent and
 * bad in a specific direction: the form would promise a live listing stays on
 * sale while the rules reject the write, or worse, promise a review that never
 * happens.
 *
 * Plain Node with no dependencies, and no TypeScript, so it can run as
 * `prebuild` on a machine that has only installed production deps.
 *
 *   node scripts/check-review-fields.mjs
 */

import { readFileSync } from "node:fs";

/** Enforced by the rules but not part of the shared list, and not a mistake. */
const RULES_ONLY = new Set([
  // A seller must never be able to stamp their own installer as having passed
  // Apple's checks. Written by scripts/verify-package.ts, never by a client, so
  // it has no place in a list the seller form reasons about.
  "packageVerification",
]);

function fail(message) {
  console.error(`\ncheck-review-fields: ${message}\n`);
  process.exit(1);
}

const types = readFileSync("lib/types.ts", "utf8");
const rules = readFileSync("firestore.rules", "utf8");

const typesBlock = types.match(
  /export const REVIEW_CRITICAL_FIELDS = \[([\s\S]*?)\] as const;/
);
if (!typesBlock) {
  fail("couldn't find REVIEW_CRITICAL_FIELDS in lib/types.ts");
}

const rulesBlock = rules.match(
  /function reviewedPartsIntact\(\) \{[\s\S]*?hasAny\(\[([\s\S]*?)\]\)/
);
if (!rulesBlock) {
  fail("couldn't find reviewedPartsIntact() in firestore.rules");
}

const names = (block) => [...block.matchAll(/['"]([A-Za-z0-9_]+)['"]/g)].map((m) => m[1]);

const fromTypes = new Set(names(typesBlock[1]));
const fromRules = new Set(names(rulesBlock[1]).filter((n) => !RULES_ONLY.has(n)));

if (!fromTypes.size) fail("REVIEW_CRITICAL_FIELDS looks empty");

const missingInRules = [...fromTypes].filter((n) => !fromRules.has(n));
const missingInTypes = [...fromRules].filter((n) => !fromTypes.has(n));

if (missingInRules.length || missingInTypes.length) {
  const lines = [];
  if (missingInRules.length) {
    lines.push(
      `  in lib/types.ts but NOT enforced by firestore.rules: ${missingInRules.join(", ")}`,
      "    → the form promises a review that will not happen."
    );
  }
  if (missingInTypes.length) {
    lines.push(
      `  in firestore.rules but NOT in lib/types.ts: ${missingInTypes.join(", ")}`,
      "    → the rules will reject a save the form said would stay live."
    );
  }
  fail(
    "the review-critical field lists have drifted.\n" +
      lines.join("\n") +
      "\n\n  Add it to both, or to RULES_ONLY in this script if it is" +
      " deliberately rules-side only."
  );
}

console.log(
  `check-review-fields: ok (${[...fromTypes].sort().join(", ")})`
);
