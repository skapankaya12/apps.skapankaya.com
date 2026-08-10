"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  getListingById,
  reviewListing,
  requestDownload,
  notifyReviewDecision,
  formatPrice,
  setListingCategory,
} from "@/lib/store";
import { CATEGORY_LABELS, RUNTIME_LABELS, type Category } from "@/lib/types";
import { Section, Button, ButtonLink, Badge, StatusBadge } from "@/components/ui";
import { Monogram } from "@/components/Monogram";

/** The reviewer's checklist, mirroring BUSINESS_MODEL.md §3. */
const CHECKLIST = [
  "Runs in ≤5 minutes on a clean machine following its SETUP.md",
  "Source is human/AI-readable (not obfuscated or minified-only)",
  "All network calls & dependencies disclosed in manifest.json",
  "AI code scan shows no red flags (no exfiltration, no hidden shell-out)",
  "Listing is honest: real screenshots, accurate description",
];

export default function AdminReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useUser();
  const listing = useStoreValue(() => getListingById(params.id));
  const [checks, setChecks] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [note, setNote] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  if (!user || user.role !== "admin") {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Admins only</h1>
        <ButtonLink href="/" className="mt-6" variant="secondary">Home</ButtonLink>
      </Section>
    );
  }

  if (!listing) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Submission not found</h1>
        <ButtonLink href="/admin" className="mt-6" variant="secondary">Back to queue</ButtonLink>
      </Section>
    );
  }

  const allChecked = checks.every(Boolean);

  async function decide(decision: "approved" | "rejected") {
    const defaultNote =
      decision === "approved"
        ? "Passed all checks."
        : note || "Did not pass review.";
    const finalNote = note || defaultNote;
    reviewListing(listing!.id, decision, finalNote);
    // Email the seller (best-effort); await so it fires before we navigate away.
    await notifyReviewDecision(listing!.id, decision, finalNote);
    router.push("/admin");
  }

  async function inspect() {
    setDownloadError("");
    setDownloading(true);
    try {
      const url = await requestDownload(listing!.id);
      window.location.assign(url);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Couldn't fetch the package."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Section className="max-w-4xl py-12">
      <ButtonLink href="/admin" variant="ghost" size="sm">← Review queue</ButtonLink>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Submission details */}
        <div>
          <div className="flex items-start gap-4">
            <Monogram title={listing.title} className="h-16 w-16 rounded-2xl text-2xl" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
                <StatusBadge status={listing.status} />
              </div>
              <p className="mt-1 text-[var(--muted)]">{listing.tagline}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="neutral">{RUNTIME_LABELS[listing.runtime]}</Badge>
            <Badge tone="neutral">v{listing.version}</Badge>
            <Badge tone="accent">
              {listing.setupMode === "one-command" ? "1-command" : "AI-assisted"}
            </Badge>
            <Badge tone="neutral">{formatPrice(listing.priceCents)}</Badge>
          </div>

          {/*
            Category is editable here rather than shown as a badge: it decides
            which browse filter the tool appears under, sellers pick it
            themselves at submission, and they often pick wrong. Saves on change
            and leaves status alone, so re-filing a live tool doesn't unpublish
            it.
          */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label htmlFor="category" className="text-sm font-medium">
              Browse category
            </label>
            <select
              id="category"
              value={listing.category}
              onChange={async (e) => {
                const next = e.target.value as Category;
                setCategoryError("");
                setSavingCategory(true);
                try {
                  await setListingCategory(listing!.id, next);
                } catch {
                  setCategoryError("Couldn't save. Check your admin access.");
                }
                setSavingCategory(false);
              }}
              disabled={savingCategory}
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
            >
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            {savingCategory && (
              <span className="text-sm text-[var(--muted)]">Saving…</span>
            )}
            {categoryError && (
              <span className="text-sm text-[var(--danger)]">{categoryError}</span>
            )}
          </div>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Description
          </h2>
          <p className="mt-2 leading-relaxed text-[var(--foreground)]/85">
            {listing.description}
          </p>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Submitted package
          </h2>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <span className="font-mono text-sm">
              📦 {listing.packagePath?.split("/").pop() ?? "package.zip"}
            </span>
            <button
              onClick={inspect}
              disabled={downloading || !listing.packagePath}
              className="text-sm font-medium text-[var(--accent)] hover:underline disabled:opacity-50"
            >
              {downloading ? "Preparing…" : "Download to inspect"}
            </button>
          </div>
          {downloadError && (
            <p className="mt-2 text-sm text-[var(--danger)]">{downloadError}</p>
          )}

          {listing.status !== "pending" && listing.reviewNote && (
            <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Review note
              </p>
              <p className="mt-1 text-sm">{listing.reviewNote}</p>
            </div>
          )}
        </div>

        {/* Decision panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="font-semibold">Review checklist</h3>
            <div className="mt-4 space-y-3">
              {CHECKLIST.map((item, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() =>
                      setChecks((c) => c.map((v, j) => (j === i ? !v : v)))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="text-[var(--muted)]">{item}</span>
                </label>
              ))}
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium">
                Note to seller{" "}
                <span className="text-[var(--muted)]">(required to reject)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Optional for approval. Explain what to fix if rejecting."
                className="mt-1.5 w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>

            {listing.status === "pending" ? (
              <div className="mt-5 space-y-2">
                <Button
                  variant="success"
                  className="w-full"
                  disabled={!allChecked}
                  onClick={() => decide("approved")}
                >
                  ✓ Approve &amp; publish
                </Button>
                {!allChecked && (
                  <p className="text-center text-xs text-[var(--muted)]">
                    Complete the checklist to approve.
                  </p>
                )}
                <Button
                  variant="danger"
                  className="w-full"
                  disabled={!note.trim()}
                  onClick={() => decide("rejected")}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <div className="mt-5">
                <Badge tone={listing.status === "approved" ? "success" : "danger"}>
                  Already {listing.status}
                </Badge>
                <Button
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => decide(listing.status === "approved" ? "rejected" : "approved")}
                >
                  Reverse decision
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Section>
  );
}
