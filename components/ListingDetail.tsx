"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  getListingBySlug,
  getListingsLoaded,
  hasPurchased,
  formatPrice,
  isInCart,
  addToCart,
  removeFromCart,
  isBookmarked,
  toggleBookmark,
  getCategories,
} from "@/lib/store";
import { RUNTIME_LABELS, categoryLabel, type Listing } from "@/lib/types";
import { safeHttpsUrl } from "@/lib/utils";
import { Section, Button, ButtonLink, Badge, VerifiedBadge } from "./ui";
import { ScanDisclaimer } from "./Disclaimer";
import { Expandable } from "./Expandable";
import { ListingGallery } from "./ListingGallery";
import { RichText } from "./RichText";

/**
 * `initial` is the listing read on the server by the page. It's what gets
 * rendered into the HTML (so crawlers and the first paint see the real tool,
 * not a spinner); the live client store takes over the moment it hydrates.
 */
export function ListingDetail({
  slug,
  initial,
}: {
  slug: string;
  initial?: Listing;
}) {
  const router = useRouter();
  const user = useUser();
  const listing = useStoreValue(() => getListingBySlug(slug)) ?? initial;
  const loaded = useStoreValue(getListingsLoaded);
  const owned = useStoreValue(() =>
    user && listing ? hasPurchased(user.uid, listing.id) : false
  );
  const inCart = useStoreValue(() => (listing ? isInCart(listing.id) : false));
  const saved = useStoreValue(() => (listing ? isBookmarked(listing.id) : false));
  const categories = useStoreValue(getCategories);

  if (!listing) {
    // Still waiting on Firestore's first response: show a loader, not "not found".
    if (!loaded) {
      return (
        <Section className="py-24 text-center">
          <Spinner />
          <p className="mt-4 text-sm text-[var(--muted)]">Loading tool…</p>
        </Section>
      );
    }
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

      {/*
        `min-w-0` on both cells is load-bearing, not tidying. A grid item
        defaults to `min-width: auto`, so the column grows to fit its widest
        unbreakable content instead of the container — and the gallery's
        thumbnail strip is five 96px tiles, i.e. 528px of it. On a 375px phone
        that stretched the single mobile column to 528px and pushed the whole
        page sideways: headings, badges and video all clipped at the right edge.
      */}
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main */}
        <div className="min-w-0">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{listing.title}</h1>
            <p className="mt-1 text-lg text-[var(--muted)]">{listing.tagline}</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <VerifiedBadge />
            <Badge tone="neutral">{categoryLabel(listing.category, categories)}</Badge>
            <Badge tone="neutral">{RUNTIME_LABELS[listing.runtime]}</Badge>
            <Badge tone="neutral">v{listing.version}</Badge>
          </div>

          {/* Demo video and screenshots share one gallery — see ListingGallery */}
          <div className="mt-8">
            <ListingGallery
              demoVideo={listing.demoVideo}
              screenshots={listing.screenshots}
              title={listing.title}
            />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold">What it does</h2>
            {/* Collapsed behind "Read more" — the full text is still in the
                HTML, see Expandable. */}
            <Expandable moreLabel="Read the full description">
              <RichText
                text={listing.description}
                className="mt-3 max-w-prose text-[var(--foreground)]/85"
              />
            </Expandable>
          </div>

          {/* How to run, softened for non-devs */}
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

          {/* About / contact the seller */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold">About the seller</h2>
            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-base font-semibold text-[var(--accent)]">
                  {listing.sellerName.trim().charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  {/* break-words: a name or bio can carry a long URL or an
                      unspaced run, which otherwise pushes straight out of the
                      card on a phone instead of wrapping. */}
                  <div className="break-words font-medium">{listing.sellerName}</div>
                  <p className="mt-1 break-words text-sm text-[var(--muted)]">
                    {listing.sellerBio?.trim() ||
                      "An independent maker selling small, local-first tools on the marketplace."}
                  </p>
                </div>
              </div>

              {(listing.sellerEmail || safeHttpsUrl(listing.sellerWebsite)) && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                  {listing.sellerEmail && (
                    <a
                      href={`mailto:${listing.sellerEmail}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:border-[var(--accent)]"
                    >
                      <MailIcon /> Contact
                    </a>
                  )}
                  {safeHttpsUrl(listing.sellerWebsite) && (
                    <a
                      href={safeHttpsUrl(listing.sellerWebsite)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:border-[var(--accent)]"
                    >
                      <GlobeIcon /> Website
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <ScanDisclaimer />
          </div>
        </div>

        {/* Buy sidebar */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
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
                ✓ Download from your library
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
                  {inCart ? "✓ In cart" : "+ Add to cart"}
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
                "No account needed",
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

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "var(--accent)" : "none"} stroke={filled ? "var(--accent)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="mx-auto h-8 w-8 animate-spin text-[var(--muted)]"
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
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
