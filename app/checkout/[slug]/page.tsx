"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getListingBySlug, recordPurchase, formatPrice } from "@/lib/store";
import { Section, Button, ButtonLink, Badge } from "@/components/ui";
import { ScanDisclaimer } from "@/components/Disclaimer";
import { brand } from "@/lib/brand";
import { Monogram } from "@/components/Monogram";

export default function CheckoutPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const user = useUser();
  const listing = useStoreValue(() => getListingBySlug(params.slug));
  const [processing, setProcessing] = useState(false);

  if (!listing) {
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

  // Estimated VAT line (illustrative). Real VAT is computed by Stripe Tax.
  const vat = Math.round(listing.priceCents * 0.2);
  const total = listing.priceCents + vat;

  function handlePay() {
    setProcessing(true);
    // In production: POST to /api/checkout -> Stripe Checkout Session (Connect
    // destination charge, 15% application fee) -> redirect to Stripe. The
    // purchase is recorded by the webhook, not here. This stands in for that.
    setTimeout(() => {
      recordPurchase(user!, listing!);
      router.push(`/checkout/success?app=${listing!.slug}`);
    }, 900);
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
                <dt className="text-[var(--muted)]">App price</dt>
                <dd className="tabular-nums">{formatPrice(listing.priceCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">VAT (est.)</dt>
                <dd className="tabular-nums">{formatPrice(vat)}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(total)}</dd>
              </div>
            </dl>

            <Button
              onClick={handlePay}
              disabled={processing}
              className="mt-5 w-full"
              size="lg"
            >
              {processing ? "Processing…" : `Pay ${formatPrice(total)}`}
            </Button>
            <p className="mt-3 text-center text-xs text-[var(--muted)]">
              🔒 Secured by Stripe (demo, no real charge)
            </p>
          </div>
        </aside>
      </div>
    </Section>
  );
}
