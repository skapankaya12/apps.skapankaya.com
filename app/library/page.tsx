"use client";

import { useState } from "react";
import Link from "next/link";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  getPurchases,
  getListingById,
  formatPrice,
  requestDownload,
} from "@/lib/store";
import { Section, ButtonLink, Button, Badge } from "@/components/ui";
import { Monogram } from "@/components/Monogram";
import { safeHttpsUrl } from "@/lib/utils";
import type { Purchase } from "@/lib/types";

export default function LibraryPage() {
  const user = useUser();
  const purchases = useStoreValue(() => (user ? getPurchases(user.uid) : []));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDownload(listingId: string) {
    setError("");
    setBusyId(listingId);
    try {
      const url = await requestDownload(listingId);
      window.location.assign(url); // attachment disposition → downloads in place
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (!user) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Your library</h1>
        <p className="mt-2 text-[var(--muted)]">
          Sign in to see the apps you own.
        </p>
        <ButtonLink href="/login?next=/library" className="mt-6">
          Sign in
        </ButtonLink>
      </Section>
    );
  }

  return (
    <Section className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Your library</h1>
      <p className="mt-1 text-[var(--muted)]">
        Everything you own. Re-download anytime. It&apos;s yours forever.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {purchases.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center">
          <p className="text-[var(--muted)]">You haven&apos;t bought any apps yet.</p>
          <ButtonLink href="/browse" className="mt-5" variant="secondary">
            Browse apps
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {purchases.map((p) => {
            const listing = getListingById(p.listingId);
            const updateAvailable =
              listing && listing.version !== p.purchasedVersion;
            return (
              <div
                key={p.id}
                className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center"
              >
                <Monogram title={p.listingTitle} className="h-14 w-14 text-xl" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/app/${p.listingSlug}`}
                      className="font-semibold hover:text-[var(--accent)]"
                    >
                      {p.listingTitle}
                    </Link>
                    {updateAvailable && (
                      <Badge tone="accent">Update available · v{listing!.version}</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">
                    by {p.sellerName} · you have v{p.purchasedVersion} ·{" "}
                    {formatPrice(p.amountCents)} paid
                  </p>
                  {(p.licenseKey || p.licenseKeyPending) && <PurchaseKey purchase={p} />}
                </div>
                <div className="flex gap-2">
                  <Link href="/how-to-run" className="hidden sm:block">
                    <Button variant="ghost" size="sm">Setup guide</Button>
                  </Link>
                  {/* Downloads via a short-lived signed Storage URL, minted
                      server-side after verifying ownership (app/api/download). */}
                  <Button
                    size="sm"
                    disabled={busyId === p.listingId}
                    onClick={() => handleDownload(p.listingId)}
                  >
                    {busyId === p.listingId
                      ? "Preparing…"
                      : `↓ Download${updateAvailable ? " latest" : ""}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/**
 * The licence key that came with a purchase. The Library is its record: the
 * receipt email carries a copy, but an email can be lost and this cannot.
 */
function PurchaseKey({ purchase }: { purchase: Purchase }) {
  const [copied, setCopied] = useState(false);
  const redeem = safeHttpsUrl(purchase.licenseRedeemUrl);

  if (!purchase.licenseKey) {
    return (
      <p className="mt-3 rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-2 text-sm">
        Your license key is on its way. It appears here, and by email, as soon
        as the maker adds more.
      </p>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(purchase.licenseKey!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused (an older browser, or permission). The key is on
      // screen and selectable, so there is nothing more to do.
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--muted)]">License key</span>
        <code className="break-all font-mono text-xs">{purchase.licenseKey}</code>
        <button
          type="button"
          onClick={copy}
          className="text-xs font-medium text-[var(--accent)] hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {purchase.licenseInstructions && (
        <p className="mt-1 text-xs text-[var(--muted)]">{purchase.licenseInstructions}</p>
      )}
      {redeem && (
        <a
          href={redeem}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
        >
          Redeem it here
        </a>
      )}
    </div>
  );
}
