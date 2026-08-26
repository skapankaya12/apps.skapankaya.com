"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  getListingBySlug,
  getListingsLoaded,
  formatPrice,
  getIdToken,
  isBookmarked,
  toggleBookmark,
} from "@/lib/store";
import { Section, Button, ButtonLink, Badge } from "@/components/ui";
import { ScanDisclaimer } from "@/components/Disclaimer";
import { brand } from "@/lib/brand";
import { Monogram } from "@/components/Monogram";

export default function CheckoutPage() {
  const params = useParams<{ slug: string }>();
  const user = useUser();
  const listing = useStoreValue(() => getListingBySlug(params.slug));
  const loaded = useStoreValue(getListingsLoaded);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /**
   * Set when checkout is refused because payments aren't switched on yet. That
   * isn't the buyer's problem to solve and there's nothing for them to retry,
   * so instead of a red error we keep the tool for them and say so.
   */
  const [savedForLater, setSavedForLater] = useState(false);

  if (!listing) {
    if (!loaded) {
      return (
        <Section className="py-24 text-center">
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        </Section>
      );
    }
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">App not found</h1>
        <ButtonLink href="/browse" className="mt-6" variant="secondary">
          Back to browse
        </ButtonLink>
      </Section>
    );
  }

  if (!user) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Please sign in to continue</h1>
        <ButtonLink href={`/login?next=/checkout/${params.slug}`} className="mt-6">
          Sign in
        </ButtonLink>
      </Section>
    );
  }

  const total = listing.priceCents;

  async function pay() {
    if (!listing) return;
    setBusy(true);
    setError("");
    try {
      const token = await getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.error === "not-configured") {
        // toggleBookmark flips, so only call it when it isn't already saved —
        // otherwise trying to buy something you'd saved would un-save it.
        // Always signed in here: checkout redirects to /login when not.
        if (!isBookmarked(listing.id)) await toggleBookmark(listing.id);
        setSavedForLater(true);
      } else {
        setError(checkoutError(data.error));
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <Section className="max-w-3xl py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_300px]">
        {/* Order */}
        <div>
          <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <Monogram title={listing.title} className="h-14 w-14 text-xl" />
            <div className="flex-1">
              <h2 className="font-semibold">{listing.title}</h2>
              <p className="text-sm text-[var(--muted)]">
                v{listing.version} · by {listing.sellerName}
              </p>
            </div>
            <Badge tone="accent">One-time</Badge>
          </div>

          <div className="mt-6">
            <ScanDisclaimer />
          </div>

          <p className="mt-6 text-xs text-[var(--muted)]">
            By purchasing you agree to the personal-use license and our refund
            policy. Payment is processed securely by Stripe. {brand.name} never
            sees your card details.
          </p>
        </div>

        {/* Summary */}
        <aside>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="text-sm font-semibold">Order summary</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Price</dt>
                <dd className="tabular-nums">{formatPrice(listing.priceCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(total)}</dd>
              </div>
            </dl>

            <div className="mt-5">
              {savedForLater ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-center">
                  <p className="text-sm font-medium">
                    Saved for later ♥
                  </p>
                  <p className="mt-1.5 text-sm text-[var(--muted)]">
                    Payments aren&apos;t switched on yet, so we&apos;ve kept{" "}
                    <span className="text-[var(--foreground)]">{listing.title}</span>{" "}
                    in your saved list. We&apos;ll email you at launch.
                  </p>
                  <ButtonLink href="/saved" variant="secondary" className="mt-4 w-full">
                    View saved tools
                  </ButtonLink>
                  <ButtonLink href="/browse" variant="ghost" size="sm" className="mt-2 w-full">
                    Keep browsing →
                  </ButtonLink>
                </div>
              ) : (
                <>
                  <Button onClick={pay} disabled={busy} size="lg" className="w-full">
                    {busy ? "Taking you to Stripe…" : `Pay ${formatPrice(total)}`}
                  </Button>
                  {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
                  <p className="mt-2 text-center text-xs text-[var(--muted)]">
                    Secure payment by Stripe. You&apos;ll get instant access after paying.
                  </p>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </Section>
  );
}

function checkoutError(code?: string): string {
  switch (code) {
    case "not-configured":
      return "Payments aren't live yet. Please check back soon.";
    case "seller-not-ready":
      return "This maker hasn't finished setting up payouts yet, so it can't be purchased right now.";
    case "own-listing":
      return "This is your own tool — you can't buy it.";
    case "not-available":
      return "This tool isn't available for purchase right now.";
    case "unauthorized":
      return "Your session expired. Please sign in again.";
    default:
      return "Couldn't start checkout. Please try again.";
  }
}
