"use client";

import Link from "next/link";
import type { Listing } from "@/lib/types";
import { CATEGORY_LABELS, RUNTIME_LABELS } from "@/lib/types";
import {
  formatPrice,
  isInCart,
  addToCart,
  removeFromCart,
  isBookmarked,
  toggleBookmark,
} from "@/lib/store";
import { useStoreValue } from "@/lib/hooks";
import { Badge } from "./ui";

export function ListingCard({ listing }: { listing: Listing }) {
  const inCart = useStoreValue(() => isInCart(listing.id));
  const saved = useStoreValue(() => isBookmarked(listing.id));

  return (
    <div className="group relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]">
      {/* Bookmark */}
      <button
        aria-label={saved ? "Remove bookmark" : "Save for later"}
        onClick={() => toggleBookmark(listing.id)}
        className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)]"
      >
        <HeartIcon filled={saved} />
      </button>

      <Link href={`/app/${listing.slug}`} className="flex flex-1 flex-col">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--surface-muted)] text-2xl">
          {listing.glyph}
        </div>

        <h3 className="mt-4 pr-8 font-semibold tracking-tight group-hover:text-[var(--accent)]">
          {listing.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
          {listing.tagline}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{CATEGORY_LABELS[listing.category]}</Badge>
          {listing.setupMode === "one-command" ? (
            <Badge tone="accent">No setup</Badge>
          ) : (
            <Badge tone="accent">Guided setup</Badge>
          )}
          {listing.demoVideo && <Badge tone="neutral">▶ Demo</Badge>}
        </div>
      </Link>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
        <span className="text-sm font-semibold tabular-nums">
          {formatPrice(listing.priceCents)}
        </span>
        <button
          onClick={() =>
            inCart ? removeFromCart(listing.id) : addToCart(listing.id)
          }
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            inCart
              ? "bg-[var(--success-soft)] text-[var(--success)]"
              : "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]"
          }`}
        >
          {inCart ? "✓ In cart" : "+ Add to cart"}
        </button>
      </div>
      <span className="mt-2 text-xs text-[var(--muted)]">
        by {listing.sellerName}
        {listing.salesCount > 0 && ` · ${listing.salesCount} sold`}
      </span>
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "var(--accent)" : "none"}
      stroke={filled ? "var(--accent)" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}
