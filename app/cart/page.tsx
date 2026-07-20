"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  getCartListings,
  removeFromCart,
  clearCart,
  recordPurchase,
  formatPrice,
} from "@/lib/store";
import { Section, Button, ButtonLink } from "@/components/ui";
import { ScanDisclaimer } from "@/components/Disclaimer";
import { Monogram } from "@/components/Monogram";

export default function CartPage() {
  const router = useRouter();
  const user = useUser();
  const items = useStoreValue(getCartListings);
  const [processing, setProcessing] = useState(false);

  const subtotal = items.reduce((s, l) => s + l.priceCents, 0);
  const vat = Math.round(subtotal * 0.2);
  const total = subtotal + vat;

  function checkout() {
    if (!user) {
      router.push("/login?next=/cart");
      return;
    }
    setProcessing(true);
    // Demo stand-in for Stripe. In prod: one Checkout Session for the whole cart;
    // the webhook records each purchase and clears the cart server-side.
    setTimeout(() => {
      const count = items.length;
      items.forEach((l) => recordPurchase(user!, l));
      clearCart();
      router.push(`/checkout/success?count=${count}`);
    }, 900);
  }

  return (
    <Section className="max-w-4xl py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center">
          <p className="text-[var(--muted)]">Your cart is empty.</p>
          <ButtonLink href="/browse" className="mt-5" variant="secondary">
            Find a tool
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            {items.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <Monogram title={l.title} />
                <div className="flex-1">
                  <Link href={`/app/${l.slug}`} className="font-semibold hover:text-[var(--accent)]">
                    {l.title}
                  </Link>
                  <p className="text-sm text-[var(--muted)]">by {l.sellerName}</p>
                </div>
                <span className="font-semibold tabular-nums">{formatPrice(l.priceCents)}</span>
                <button
                  onClick={() => removeFromCart(l.id)}
                  aria-label="Remove"
                  className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--danger)]"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="pt-2">
              <ScanDisclaimer compact />
            </div>
          </div>

          <aside>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-sm font-semibold">Summary</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--muted)]">Subtotal ({items.length})</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
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
              <Button onClick={checkout} disabled={processing} className="mt-5 w-full" size="lg">
                {processing ? "Processing…" : `Checkout · ${formatPrice(total)}`}
              </Button>
              <p className="mt-3 text-center text-xs text-[var(--muted)]">
                🔒 Secured by Stripe (demo, no real charge)
              </p>
            </div>
          </aside>
        </div>
      )}
    </Section>
  );
}
