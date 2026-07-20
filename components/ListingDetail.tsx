"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  getListingBySlug,
  hasPurchased,
  formatPrice,
  isInCart,
  addToCart,
  removeFromCart,
  isBookmarked,
  toggleBookmark,
} from "@/lib/store";
import { CATEGORY_LABELS, RUNTIME_LABELS } from "@/lib/types";
import { Section, Button, ButtonLink, Badge, VerifiedBadge } from "./ui";
import { ScanDisclaimer } from "./Disclaimer";

export function ListingDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const user = useUser();
  const listing = useStoreValue(() => getListingBySlug(slug));
  const owned = useStoreValue(() =>
    user && listing ? hasPurchased(user.uid, listing.id) : false
  );
  const inCart = useStoreValue(() => (listing ? isInCart(listing.id) : false));
  const saved = useStoreValue(() => (listing ? isBookmarked(listing.id) : false));

  if (!listing) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Tool not found</h1>
        <p className="mt-2 text-[var(--muted)]">
          This tool may have been removed or is still in review.
        </p>
        <ButtonLink href="/browse" className="mt-6" variant="secondary">
          Back to browse
        </ButtonLink>
      </Section>
    );
  }

  function handleBuyNow() {
    if (!user) {
      router.push(`/login?next=/app/${slug}`);
      return;
    }
    router.push(`/checkout/${slug}`);
  }

  return (
    <Section className="py-12">
      <Link href="/browse" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Browse
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* Main */}
        <div>
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[var(--surface-muted)] text-4xl">
              {listing.glyph}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{listing.title}</h1>
              <p className="mt-1 text-lg text-[var(--muted)]">{listing.tagline}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <VerifiedBadge />
            <Badge tone="neutral">{CATEGORY_LABELS[listing.category]}</Badge>
            <Badge tone="neutral">{RUNTIME_LABELS[listing.runtime]}</Badge>
            <Badge tone="neutral">v{listing.version}</Badge>
          </div>

          {/* Media: demo video + screenshots */}
          <div className="mt-8">
            {listing.demoVideo ? (
              <div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--foreground)]">
                <div className="text-center text-[var(--background)]">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--background)]/15 backdrop-blur">
                    <PlayIcon />
                  </div>
                  <p className="mt-3 text-sm opacity-80">Demo video</p>
                  <p className="text-xs opacity-50">{listing.demoVideo}</p>
                </div>
                <Badge tone="accent" className="absolute left-4 top-4">▶ See it work</Badge>
              </div>
            ) : (
              <div className="grid aspect-video place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-6xl">
                {listing.glyph}
              </div>
            )}

            {listing.screenshots.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {listing.screenshots.slice(0, 5).map((shot, i) => (
                  <div
                    key={i}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-center"
                  >
                    <span className="text-xl">{listing.glyph}</span>
                    <span className="text-[10px] leading-tight text-[var(--muted)]">{shot}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold">What it does</h2>
            <p className="mt-3 leading-relaxed text-[var(--foreground)]/85">
              {listing.description}
            </p>
          </div>

          {/* How to run — softened for non-devs */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold">How you&apos;ll run it</h2>
            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              {listing.setupMode === "one-command" ? (
                <>
                  <Badge tone="accent" className="mb-3">No setup needed</Badge>
                  <p className="text-sm text-[var(--muted)]">
                    Download, open the folder, and start it with the single step in
                    the included guide. If you&apos;d rather not touch anything
                    technical, an AI assistant can do it for you too.
                  </p>
                </>
              ) : (
                <>
                  <Badge tone="accent" className="mb-3">Guided setup</Badge>
                  <p className="text-sm text-[var(--muted)]">
                    No coding needed. Open the downloaded folder in a free AI
                    assistant (like Claude or Cursor) and say{" "}
                    <span className="rounded bg-[var(--foreground)] px-1.5 py-0.5 font-mono text-xs text-[var(--background)]">
                      set this up and run it
                    </span>
                    . It reads the included guide and does the rest.
                  </p>
                </>
              )}
              <Link href="/how-to-run" className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline">
                See the full how-to-run guide →
              </Link>
            </div>
          </div>

          <div className="mt-8">
            <ScanDisclaimer />
          </div>
        </div>

        {/* Buy sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-semibold tabular-nums">
                  {formatPrice(listing.priceCents)}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">One-time · yours forever</p>
              </div>
              <button
                aria-label={saved ? "Remove bookmark" : "Save for later"}
                onClick={() => toggleBookmark(listing.id)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-muted)]"
              >
                <HeartIcon filled={saved} />
              </button>
            </div>

            {owned ? (
              <ButtonLink href="/library" className="mt-5 w-full" variant="success">
                ✓ In your library — download
              </ButtonLink>
            ) : (
              <div className="mt-5 space-y-2">
                <Button onClick={handleBuyNow} className="w-full" size="lg">
                  Buy now
                </Button>
                <Button
                  onClick={() =>
                    inCart ? removeFromCart(listing.id) : addToCart(listing.id)
                  }
                  variant="secondary"
                  className="w-full"
                >
                  {inCart ? "✓ In cart — view cart" : "+ Add to cart"}
                </Button>
                {inCart && (
                  <ButtonLink href="/cart" variant="ghost" size="sm" className="w-full">
                    Go to cart →
                  </ButtonLink>
                )}
              </div>
            )}

            <ul className="mt-5 space-y-2.5 text-sm text-[var(--muted)]">
              {[
                "Runs on your own computer",
                "14-day money-back guarantee",
                "Re-download anytime",
                "Free updates",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
              Made by <span className="text-[var(--foreground)]">{listing.sellerName}</span>
              {listing.salesCount > 0 && ` · ${listing.salesCount} sold`}
            </div>
          </div>
        </aside>
      </div>
    </Section>
  );
}

function PlayIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "var(--accent)" : "none"} stroke={filled ? "var(--accent)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
