"use client";

import Link from "next/link";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getPurchases, getListingById, formatPrice } from "@/lib/store";
import { Section, ButtonLink, Button, Badge } from "@/components/ui";

export default function LibraryPage() {
  const user = useUser();
  const purchases = useStoreValue(() => (user ? getPurchases(user.uid) : []));

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
        Everything you own. Re-download anytime — it&apos;s yours forever.
      </p>

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
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)] text-3xl">
                  {listing?.glyph ?? "📦"}
                </div>
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
                </div>
                <div className="flex gap-2">
                  <Link href="/how-to-run" className="hidden sm:block">
                    <Button variant="ghost" size="sm">Setup guide</Button>
                  </Link>
                  {/* In production: a short-lived signed Storage URL. */}
                  <Button
                    size="sm"
                    onClick={() =>
                      alert(
                        "In production this downloads the app package via a short-lived signed URL from Firebase Storage."
                      )
                    }
                  >
                    ↓ Download{updateAvailable ? " latest" : ""}
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
