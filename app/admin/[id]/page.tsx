"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  getListingById,
  reviewListing,
  requestDownload,
  notifyReviewDecision,
  formatPrice,
  setListingCategory,
  getCategories,
  fetchLicenseKeyStock,
  revealReviewKey,
} from "@/lib/store";
import {
  PLATFORM_LABELS,
  RUNTIME_LABELS,
  SETUP_MODE_LABELS,
  type AppUser,
  type LicenseKeyStock,
  type Listing,
  type SellerProfile,
} from "@/lib/types";
import { safeHttpsUrl } from "@/lib/utils";
import { Section, Button, ButtonLink, Badge, StatusBadge } from "@/components/ui";
import { Monogram } from "@/components/Monogram";
import { RichText } from "@/components/RichText";
import { NoteEditor, noteIsUploading } from "@/components/NoteEditor";
import { ReviewMedia } from "@/components/ReviewMedia";
import { ListingDetail } from "@/components/ListingDetail";

/** The reviewer's checklist, mirroring BUSINESS_MODEL.md §3. */
const CHECKLIST = [
  "Runs in ≤5 minutes on a clean machine following its SETUP.md",
  "Source is human/AI-readable (not obfuscated or minified-only)",
  "All network calls & dependencies disclosed in manifest.json",
  "AI code scan shows no red flags (no exfiltration, no hidden shell-out)",
  "Listing is honest: real screenshots, accurate description",
];

/** Added to the checklist for a listing that needs licence keys. */
const KEY_CHECK = "Test key activates the app, and the listing says a key is included";

/**
 * A keyed listing's side of review: how many keys are loaded, what the buyer
 * will be told, and one key to try.
 *
 * The test key is set aside for good by the server once revealed, because
 * activating it may use up its only activation. Asking again shows the same
 * key rather than spending another.
 */
function LicenseKeysReview({ listing }: { listing: Listing }) {
  const [stock, setStock] = useState<LicenseKeyStock | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void fetchLicenseKeyStock(listing.id).then((s) => {
      if (alive) setStock(s);
    });
    return () => {
      alive = false;
    };
  }, [listing.id]);

  async function reveal() {
    setBusy(true);
    setError("");
    try {
      const k = await revealReviewKey(listing.id);
      if (!k) setError("No keys loaded, so there is nothing to test.");
      setKey(k);
      setStock(await fetchLicenseKeyStock(listing.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get a test key.");
    } finally {
      setBusy(false);
    }
  }

  const redeem = safeHttpsUrl(listing.licenseRedeemUrl);
  const none = stock !== null && stock.available === 0 && stock.review === 0;

  return (
    <div
      className={`mt-3 rounded-xl border p-4 text-sm ${
        none
          ? "border-[var(--danger)] bg-[var(--danger-soft)]"
          : "border-[var(--border)] bg-[var(--surface-muted)]"
      }`}
    >
      <p className="font-semibold">License keys</p>
      <p className={`mt-1 ${none ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
        {stock === null
          ? "Counting…"
          : none
            ? "No keys loaded. Approved like this, nobody could buy it."
            : `${stock.available} ready to sell, ${stock.assigned} given to buyers${
                stock.review ? `, ${stock.review} set aside for review` : ""
              }.`}
      </p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Buyers are told
      </p>
      <p className="mt-1">{listing.licenseInstructions || "(nothing written)"}</p>
      {redeem && (
        <p className="mt-1">
          Redeem at{" "}
          <a
            href={redeem}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            {redeem}
          </a>
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" onClick={reveal} disabled={busy}>
          {busy ? "…" : key ? "Test key" : "Reveal a test key"}
        </Button>
        {key && (
          <code className="break-all rounded bg-[var(--surface)] px-2 py-1 font-mono text-xs">
            {key}
          </code>
        )}
      </div>
      {key && (
        <p className="mt-1 text-xs text-[var(--muted)]">
          Set aside for you. It will never be sold to a buyer.
        </p>
      )}
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

/**
 * The Apple signature verdict for a native installer.
 *
 * Deliberately loud when it is missing. The seller form tells makers "we check
 * the signature before it goes live", and that sentence is only true if this
 * check actually ran, so an unchecked installer has to look wrong rather than
 * look neutral. A verdict recorded against a different packagePath is treated
 * as missing: the seller re-uploaded, and the old pass vouches for a file that
 * is no longer there.
 */
function SignatureVerdict({ listing }: { listing: Listing }) {
  const v = listing.packageVerification;
  const stale = Boolean(v && listing.packagePath && v.packagePath !== listing.packagePath);
  const state = !v || stale ? "missing" : v.status;

  const tone =
    state === "pass"
      ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
      : state === "fail"
        ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
        : "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]";

  return (
    <div className={`mt-3 rounded-xl border p-4 text-sm ${tone}`}>
      <p className="font-semibold">
        {state === "pass"
          ? "Apple signature verified"
          : state === "fail"
            ? "Apple signature check FAILED"
            : stale
              ? "Package changed since it was last checked"
              : "Not checked yet"}
      </p>
      {state === "pass" && v ? (
        <p className="mt-1 text-[var(--muted)]">
          Notarized and signed{v.authority ? ` by ${v.authority}` : ""}
          {v.teamId ? ` (team ${v.teamId})` : ""}. Apple found no known malware,
          which is not the same as the app being good. Still your call.
        </p>
      ) : (
        <p className="mt-1 text-[var(--muted)]">
          {v?.detail ? `${v.detail}. ` : ""}Run this before approving:
          <code className="ml-1 rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
            npx tsx --env-file=.env.local scripts/verify-package.ts {listing.id}
          </code>
        </p>
      )}
    </div>
  );
}

/**
 * The submitting seller's account, read directly.
 *
 * The rules keep /users readable by its owner and by admins, and this page is
 * only ever an admin's, so the client SDK can read it here where a listing page
 * cannot. Undefined while loading, null when it could not be read.
 */
function useSeller(uid: string | undefined): AppUser | null | undefined {
  const [seller, setSeller] = useState<{ uid: string; user: AppUser | null }>();

  useEffect(() => {
    if (!uid) return;
    let live = true;
    getDoc(doc(db, "users", uid))
      .then((snap) => {
        if (live) {
          setSeller({
            uid,
            user: snap.exists() ? ({ uid, ...snap.data() } as AppUser) : null,
          });
        }
      })
      .catch(() => live && setSeller({ uid, user: null }));
    return () => {
      live = false;
    };
  }, [uid]);

  return seller && seller.uid === uid ? seller.user : undefined;
}

/**
 * The public half of a seller, from their account with the listing's own copy
 * as a per-field fallback. Mirrors resolveSellerProfile on the server, so the
 * preview shows the About-the-seller block the live page will.
 */
function sellerProfileFor(listing: Listing, user: AppUser | null): SellerProfile {
  return {
    uid: listing.sellerId,
    handle: user?.handle,
    displayName: user?.displayName || listing.sellerName,
    bio: user?.bio || listing.sellerBio,
    supportEmail: user?.supportEmail || listing.sellerEmail,
    website: user?.website || listing.sellerWebsite,
    xHandle: user?.xHandle,
    avatarUrl: user?.avatarUrl,
    memberSince: user?.createdAt ?? listing.createdAt,
  };
}

/**
 * The submission as a buyer would meet it, over the review page. The real
 * ListingDetail, same as the seller's own preview, because judging a listing
 * means judging the page it becomes.
 */
function BuyerPreview({
  listing,
  seller,
  onClose,
}: {
  listing: Listing;
  seller: SellerProfile;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buyer preview"
      className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)]"
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div>
          <span className="font-medium">Preview</span>
          <span className="ml-2 text-sm text-[var(--muted)]">
            The listing page as a buyer will see it once approved.
          </span>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Back to review
        </Button>
      </div>
      <ListingDetail
        slug={listing.slug}
        initial={{ ...listing, status: "approved" }}
        seller={seller}
        preview
      />
    </div>
  );
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useUser();
  const listing = useStoreValue(() => getListingById(params.id));
  const categories = useStoreValue(getCategories);
  // One slot more than the base list, for the key check a keyed listing adds.
  const [checks, setChecks] = useState<boolean[]>(() =>
    [...CHECKLIST, KEY_CHECK].map(() => false)
  );
  const [note, setNote] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const seller = useSeller(listing?.sellerId);

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

  const checklist = listing.needsLicenseKey ? [...CHECKLIST, KEY_CHECK] : CHECKLIST;
  const allChecked = checklist.every((_, i) => checks[i]);
  // A screenshot still uploading sits in the note as a placeholder; deciding
  // then would send the seller "Uploading screenshot…" instead of the image.
  const uploading = noteIsUploading(note);

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
    <Section className="py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonLink href="/admin" variant="ghost" size="sm">← Review queue</ButtonLink>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPreviewing(true)}>
            Preview as buyer
          </Button>
          <ButtonLink href={`/admin/${listing.id}/edit`} variant="secondary" size="sm">
            Edit listing
          </ButtonLink>
        </div>
      </div>

      {/* min-w-0: a grid item otherwise grows to its widest content. */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Submission details */}
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <Monogram title={listing.title} className="h-16 w-16 rounded-2xl text-2xl" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
                <StatusBadge status={listing.status} />
              </div>
              <p className="mt-1 text-[var(--muted)]">{listing.tagline}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                By{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {seller?.displayName || listing.sellerName}
                </span>
                {seller?.email && (
                  <>
                    {" · "}
                    <a href={`mailto:${seller.email}`} className="hover:underline">
                      {seller.email}
                    </a>
                  </>
                )}
                {seller?.handle && (
                  <>
                    {" · "}
                    <a
                      href={`/seller/${seller.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline"
                    >
                      Profile
                    </a>
                  </>
                )}
                {" · "}Submitted {formatDate(listing.createdAt)}
                {listing.updatedAt > listing.createdAt + 60_000 &&
                  `, updated ${formatDate(listing.updatedAt)}`}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="neutral">{RUNTIME_LABELS[listing.runtime]}</Badge>
            {listing.platform && (
              <Badge tone="neutral">{PLATFORM_LABELS[listing.platform]}</Badge>
            )}
            <Badge tone="neutral">v{listing.version}</Badge>
            <Badge tone="accent">
              {SETUP_MODE_LABELS[listing.setupMode]}
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
                const next = e.target.value;
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
              {/* A listing can hold a category an admin has since removed.
                  Keep it in the list, marked, so the select shows what the
                  listing actually says instead of silently reading as the
                  first option. */}
              {!categories.some((c) => c.id === listing.category) && (
                <option value={listing.category}>
                  {listing.category} (removed filter)
                </option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
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

          {/* Before the description: a demo that doesn't play or a screenshot
              that isn't the tool is the fastest reason to send one back. */}
          <div className="mt-8">
            <ReviewMedia listing={listing} />
          </div>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Description
          </h2>
          {/* Rendered, not raw: a reviewer is judging the listing buyers will
              see, so the description has to look the way it will on the page. */}
          <RichText
            text={listing.description}
            className="mt-2 text-[var(--foreground)]/85"
          />

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

          {/* An installer can't be read, so the Apple signature check stands in
              for source review. Show it here, next to Approve, because that is
              the moment it changes a decision. */}
          {listing.setupMode === "installer" && (
            <SignatureVerdict listing={listing} />
          )}

          {listing.needsLicenseKey && <LicenseKeysReview listing={listing} />}

          {listing.status !== "pending" && listing.reviewNote && (
            <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Review note
              </p>
              <RichText text={listing.reviewNote} images className="mt-1 text-sm" />
            </div>
          )}
        </div>

        {/* Decision panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="font-semibold">Review checklist</h3>
            <div className="mt-4 space-y-3">
              {checklist.map((item, i) => (
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
              <NoteEditor
                value={note}
                onChange={setNote}
                uid={user.uid}
                listingId={listing.id}
                placeholder="Optional for approval. Explain what to fix if rejecting."
              />
            </div>

            {listing.status === "pending" ? (
              <div className="mt-5 space-y-2">
                <Button
                  variant="success"
                  className="w-full"
                  disabled={!allChecked || uploading}
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
                  disabled={!note.trim() || uploading}
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
                  disabled={uploading}
                  onClick={() => decide(listing.status === "approved" ? "rejected" : "approved")}
                >
                  Reverse decision
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {previewing && (
        <BuyerPreview
          listing={listing}
          seller={sellerProfileFor(listing, seller ?? null)}
          onClose={() => setPreviewing(false)}
        />
      )}
    </Section>
  );
}
