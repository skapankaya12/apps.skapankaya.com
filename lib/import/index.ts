import type {
  Attributed, ImageCandidate, ImportResult, ImportedFields,
  SourceKind, SourceReport, SourceResult,
} from "./types";
import { IMAGE_RANK } from "./types";
import { ImportError } from "./safeFetch";
import { importFromGitHub, parseRepoUrl } from "./github";
import { importFromProductHunt, parseProductHuntUrl } from "./producthunt";
import { importFromSite } from "./site";

export { ImportError } from "./safeFetch";
export type { ImportResult } from "./types";

/** More than a few links is a mistake or an attempt to use us as a crawler. */
export const MAX_SOURCES = 3;

/**
 * Which adapter handles a link.
 *
 * Host-based, and it has to be: a GitHub URL and a marketing site are both
 * "https://…", and pulling api.github.com for a page that merely mentions
 * GitHub would be wrong. Anything unrecognised falls through to the generic
 * reader, which is the point — every product site in the world is that case.
 */
function dispatch(raw: string): { kind: SourceKind; run: () => Promise<SourceResult> } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ImportError("That doesn't look like a link. Paste a full URL.");
  }

  const repo = parseRepoUrl(url);
  if (repo) {
    return { kind: "github", run: () => importFromGitHub(repo.owner, repo.repo) };
  }

  const slug = parseProductHuntUrl(url);
  if (slug) {
    return { kind: "producthunt", run: () => importFromProductHunt(slug) };
  }

  return { kind: "site", run: () => importFromSite(raw) };
}

/**
 * Which source to believe for each field, best first.
 *
 * These orders are the whole design of the merge, and they aren't arbitrary —
 * each one encodes what a source actually knows. Product Hunt names a product
 * the way its maker introduces it, so it wins the title over a repo slug and a
 * page's `<title>`. A README is a document written to explain the tool, so it
 * wins the description over a 280-character share blurb. And `runtime` lists
 * one source because only GitHub reports a language at all.
 */
const PRECEDENCE: Record<keyof ImportedFields, SourceKind[]> = {
  title: ["producthunt", "github", "site"],
  tagline: ["producthunt", "github", "site"],
  description: ["github", "producthunt", "site"],
  category: ["github", "producthunt", "site"],
  runtime: ["github"],
  sellerWebsite: ["github", "producthunt", "site"],
};

function pick<K extends keyof ImportedFields>(
  field: K,
  results: Map<SourceKind, SourceResult>
): Attributed<NonNullable<SourceResult[K]>> | undefined {
  for (const kind of PRECEDENCE[field]) {
    const value = results.get(kind)?.[field];
    if (value !== undefined && value !== "") {
      return { value: value as NonNullable<SourceResult[K]>, from: kind };
    }
  }
  return undefined;
}

/**
 * Read every link, then reconcile them.
 *
 * Sources run together rather than in sequence: they're independent hosts and
 * the seller is watching a spinner. One failing doesn't stop the others — a
 * dead marketing site shouldn't cost you the GitHub metadata — so each result
 * is reported individually and the merge works with whatever arrived.
 */
export async function importListing(urls: string[]): Promise<ImportResult> {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))].slice(0, MAX_SOURCES);
  if (unique.length === 0) throw new ImportError("Paste a link to import from.");

  const settled = await Promise.all(
    unique.map(async (url): Promise<{ report: SourceReport; result?: SourceResult }> => {
      let kind: SourceKind = "site";
      try {
        const handler = dispatch(url);
        kind = handler.kind;
        return { report: { kind, url, ok: true }, result: await handler.run() };
      } catch (err) {
        const message =
          err instanceof ImportError
            ? err.message
            : "Couldn't read that link. It may be slow or blocking us.";
        if (!(err instanceof ImportError)) {
          console.error("[import] unexpected failure for", url, err);
        }
        return { report: { kind, url, ok: false, error: message } };
      }
    })
  );

  const results = new Map<SourceKind, SourceResult>();
  for (const entry of settled) {
    // First writer wins on a tie: two GitHub links is unusual, and the earlier
    // one is the one the seller thought of first.
    if (entry.result && !results.has(entry.result.kind)) {
      results.set(entry.result.kind, entry.result);
    }
  }

  const fields: ImportedFields = {};
  const title = pick("title", results);
  if (title) fields.title = title;
  const tagline = pick("tagline", results);
  if (tagline) fields.tagline = tagline;
  const description = pick("description", results);
  if (description) fields.description = description;
  const category = pick("category", results);
  if (category) fields.category = category;
  const runtime = pick("runtime", results);
  if (runtime) fields.runtime = runtime;
  const sellerWebsite = pick("sellerWebsite", results);
  if (sellerWebsite) fields.sellerWebsite = sellerWebsite;

  // Images pool across sources and sort by how screenshot-like they are, so a
  // Product Hunt gallery outranks an og:image even when the site was listed
  // first. Five is the listing's own ceiling.
  const images: ImageCandidate[] = [];
  const seenImages = new Set<string>();
  for (const result of results.values()) {
    for (const image of result.images ?? []) {
      if (seenImages.has(image.url)) continue;
      seenImages.add(image.url);
      images.push(image);
    }
  }
  images.sort((a, b) => IMAGE_RANK[a.kind] - IMAGE_RANK[b.kind]);

  return {
    fields,
    images: images.slice(0, 5),
    sources: settled.map((entry) => entry.report),
    notes: [...results.values()].flatMap((result) => result.notes ?? []),
  };
}
