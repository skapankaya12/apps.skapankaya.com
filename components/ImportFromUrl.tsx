"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { inputClass } from "@/components/ui/form";
import {
  ImportFailed,
  SOURCE_LABELS,
  fetchImportedImage,
  importFromUrls,
  type ImportResult,
} from "@/lib/importClient";

/* ---------------------------------------------------------------------------
   "Start from a link" — the top of the listing form.

   Two rules shape everything here, and both come from the same place: the
   seller signs an acknowledgment that this tool is theirs to sell and that they
   will support it. They can only mean that about words they have read.

     1. Imported values land in empty fields only. Anything already typed is the
        seller's own and is never overwritten by a machine.
     2. Every filled field stays marked until it is looked at. Silently
        populating a form and letting someone submit it unread is the autofill
        dark pattern, and here it would put unread claims under a signature.

   So this fills the form and then makes a point of saying what it touched.
--------------------------------------------------------------------------- */

const MAX_URLS = 3;

export function ImportFromUrl({
  onApply,
  onAddScreenshot,
  screenshotRoom,
  disabled,
}: {
  onApply: (result: ImportResult) => number;
  onAddScreenshot: (file: File) => void;
  screenshotRoom: number;
  disabled?: boolean;
}) {
  const [urls, setUrls] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [filledCount, setFilledCount] = useState(0);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busyImage, setBusyImage] = useState<string | null>(null);
  /**
   * Candidates whose <img> failed to load.
   *
   * Held in state rather than removed from the DOM on error. The tempting
   * one-liner — pulling the node out in the error handler — takes a element
   * React still believes it owns, and React throws the next time it tries to
   * reconcile that subtree. Filtering the list is the same effect by the only
   * route that's actually React's to take.
   */
  const [broken, setBroken] = useState<Set<string>>(new Set());

  const canSubmit = urls.some((u) => u.trim()) && !loading && !disabled;

  function setUrlAt(index: number, value: string) {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }

  async function run() {
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const imported = await importFromUrls(urls.map((u) => u.trim()).filter(Boolean));
      setResult(imported);
      setFilledCount(onApply(imported));
      // Every source failing is a failure, even though each was reported.
      if (imported.sources.every((s) => !s.ok)) {
        setError(imported.sources[0]?.error ?? "Couldn't read that link.");
      }
    } catch (err) {
      setError(
        err instanceof ImportFailed ? err.message : "Couldn't read that link."
      );
    } finally {
      setLoading(false);
    }
  }

  async function addImage(url: string, index: number) {
    if (screenshotRoom <= 0 || added.has(url)) return;
    setBusyImage(url);
    setError("");
    try {
      onAddScreenshot(await fetchImportedImage(url, index));
      setAdded((prev) => new Set(prev).add(url));
    } catch (err) {
      setError(err instanceof ImportFailed ? err.message : "Couldn't fetch that image.");
    } finally {
      setBusyImage(null);
    }
  }

  const usableImages = (result?.images ?? []).filter(
    (image) => !added.has(image.url) && !broken.has(image.url)
  );

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
      <h2 className="text-sm font-semibold">Start from a link</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Paste your website or Product Hunt launch. We fill what we find, you
        check it.
      </p>

      <div className="mt-3 space-y-2">
        {urls.map((url, index) => (
          <input
            key={index}
            value={url}
            onChange={(e) => setUrlAt(index, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // The panel sits inside the listing <form>; Enter here must not
                // reach it, or a half-filled listing submits itself.
                e.preventDefault();
                void run();
              }
            }}
            disabled={loading || disabled}
            placeholder={
              index === 0
                ? "https://your-product.com"
                : "https://www.producthunt.com/posts/your-launch"
            }
            className={inputClass}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={run} disabled={!canSubmit}>
          {loading ? "Reading…" : "Import"}
        </Button>
        {urls.length < MAX_URLS && (
          <button
            type="button"
            onClick={() => setUrls((prev) => [...prev, ""])}
            disabled={loading || disabled}
            className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50"
          >
            + Add another link
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
          {filledCount > 0 && (
            <p className="text-xs text-[var(--foreground)]">
              Filled {filledCount} {filledCount === 1 ? "field" : "fields"}.{" "}
              <span className="text-[var(--muted)]">
                Each stays marked until you edit it. Read them before you submit.
              </span>
            </p>
          )}
          {filledCount === 0 && result.sources.some((s) => s.ok) && (
            <p className="text-xs text-[var(--muted)]">
              Nothing new to fill. Your fields already have content.
            </p>
          )}

          <ul className="space-y-1">
            {result.sources.map((source) => (
              <li key={source.url} className="text-xs">
                <span className={source.ok ? "text-[var(--muted)]" : "text-[var(--danger)]"}>
                  {source.ok ? "✓" : "✕"} {SOURCE_LABELS[source.kind]}
                  {source.error ? `. ${source.error}` : ""}
                </span>
              </li>
            ))}
          </ul>

          {result.notes.map((note) => (
            <p key={note} className="text-xs text-[var(--warning)]">
              {note}
            </p>
          ))}

          {usableImages.length > 0 && (
            <div>
              <p className="text-xs font-medium">
                Screenshots we found{" "}
                <span className="font-normal text-[var(--muted)]">
                  {screenshotRoom > 0
                    ? `room for ${screenshotRoom} more`
                    : "all five slots are full"}
                </span>
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {usableImages.map((image, index) => (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => addImage(image.url, index)}
                    disabled={screenshotRoom <= 0 || busyImage !== null}
                    title={image.kind === "social" ? "A share card, not a screenshot" : undefined}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--background)] disabled:opacity-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() =>
                        // Hotlink-blocked or gone: drop it rather than offer a
                        // broken frame the seller can click.
                        setBroken((prev) => new Set(prev).add(image.url))
                      }
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[10px] text-white">
                      {busyImage === image.url ? "Adding…" : "Add"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
