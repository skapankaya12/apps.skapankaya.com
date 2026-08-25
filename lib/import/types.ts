import type { Category, Runtime } from "@/lib/types";

/* ---------------------------------------------------------------------------
   The shape every import source produces, and the merged result the form gets.

   Server-only by convention: everything under lib/import reaches the network
   with a URL a seller chose, so none of it should ever be pulled into the
   client bundle. Only the route handlers in app/api/import import from here —
   the browser sees this file for its *types* alone.
--------------------------------------------------------------------------- */

/** Which upstream a value came from. Drives the provenance label on a field. */
export type SourceKind = "github" | "producthunt" | "site";

export const SOURCE_LABELS: Record<SourceKind, string> = {
  github: "GitHub",
  producthunt: "Product Hunt",
  site: "your website",
};

/**
 * A picture we could offer as a screenshot, and how much we trust it.
 *
 * `kind` is the whole reason this isn't a bare string. A Product Hunt gallery
 * image is a screenshot somebody chose to show off; an og:image is a share card
 * with the product's name in big type, which is a poor listing screenshot even
 * though it's the easiest image on the page to find. Ranking them keeps the
 * good ones first when we only have room for five.
 */
export interface ImageCandidate {
  url: string;
  kind: "gallery" | "readme" | "social";
}

export const IMAGE_RANK: Record<ImageCandidate["kind"], number> = {
  gallery: 0,
  readme: 1,
  social: 2,
};

/**
 * One source's reading of a product.
 *
 * Every field is optional on purpose: a source fills only what it genuinely
 * knows and leaves the rest absent, so the merge below can tell "this source
 * has no opinion" apart from "this source says it's empty". GitHub knows the
 * runtime and nothing about pricing; Product Hunt knows the gallery and nothing
 * about the language. Absence is information.
 */
export interface SourceResult {
  kind: SourceKind;
  title?: string;
  tagline?: string;
  description?: string;
  category?: Category;
  runtime?: Runtime;
  sellerWebsite?: string;
  images?: ImageCandidate[];
  /** Things worth saying out loud, e.g. "this repository is archived". */
  notes?: string[];
}

/** A merged value, carrying where it came from so the form can say so. */
export interface Attributed<T> {
  value: T;
  from: SourceKind;
}

export interface ImportedFields {
  title?: Attributed<string>;
  tagline?: Attributed<string>;
  description?: Attributed<string>;
  category?: Attributed<Category>;
  runtime?: Attributed<Runtime>;
  sellerWebsite?: Attributed<string>;
}

/** What one source did, so a partial failure can be reported honestly. */
export interface SourceReport {
  kind: SourceKind;
  url: string;
  ok: boolean;
  /** Present when ok is false. Already phrased for a seller to read. */
  error?: string;
}

export interface ImportResult {
  fields: ImportedFields;
  images: ImageCandidate[];
  sources: SourceReport[];
  notes: string[];
}
