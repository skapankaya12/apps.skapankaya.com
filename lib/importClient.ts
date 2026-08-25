"use client";

import { getIdToken } from "./store";
import type { ImportResult } from "./import/types";

export type { ImportResult } from "./import/types";
export type { ImageCandidate, SourceKind } from "./import/types";
export { SOURCE_LABELS } from "./import/types";

/* ---------------------------------------------------------------------------
   Browser half of listing import.

   Only types cross over from lib/import — the readers themselves reach the
   network with a seller-supplied URL and must never end up in a bundle the
   browser runs.
--------------------------------------------------------------------------- */

/** Thrown with a message already written for a seller to read. */
export class ImportFailed extends Error {}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  if (!token) throw new ImportFailed("You need to be signed in to import.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

/** Read one or more product links and return a draft listing. */
export async function importFromUrls(urls: string[]): Promise<ImportResult> {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ urls }),
  });

  if (res.status === 429) {
    throw new ImportFailed("That's a lot of imports. Give it a few minutes and try again.");
  }

  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: ImportResult;
    error?: string;
  };
  if (!res.ok || !body.ok || !body.result) {
    throw new ImportFailed(body.error ?? "Couldn't read that link.");
  }
  return body.result;
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Pull one imported image down as a File.
 *
 * A File, specifically — not a URL kept on the listing. The screenshot has to
 * end up in our own Storage under the seller's uid like every other upload, and
 * the existing submit path already knows how to do that with a File. Handing it
 * one means imported screenshots and hand-picked ones travel identically, and
 * the upload code needs no idea that import exists.
 */
export async function fetchImportedImage(url: string, index: number): Promise<File> {
  const res = await fetch("/api/import/asset", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ImportFailed(body.error ?? "Couldn't fetch that image.");
  }

  const blob = await res.blob();
  const extension = EXTENSIONS[blob.type] ?? "png";
  // Named rather than derived from the source URL: those carry query strings and
  // hashes, and the name becomes part of a Storage path.
  return new File([blob], `imported-${index + 1}.${extension}`, { type: blob.type });
}
