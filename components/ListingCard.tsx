"use client";

import Link from "next/link";
import type { Listing } from "@/lib/types";
import { formatPrice, isBookmarked, toggleBookmark } from "@/lib/store";
import { useStoreValue } from "@/lib/hooks";
import { ListingMedia } from "./ListingMedia";

/**
 * A listing as a horizontal list row: the demo video sits on the left (playing
 * on hover) with the details beside it. Stacks vertically on mobile.
 *
 * Give this the full content width — stack rows in a single column rather than
 * a multi-column grid. The media panel is a fixed 288px, so in a narrow column
 * it takes nearly all of it and the title and price wrap to a few characters
 * per line.
 *
 * The whole row is clickable, but it is NOT one big <a>: the row carries real
 * links of its own (the "View details" link, the bookmark button), and an
 * anchor can't be nested inside another anchor. Instead the title link is
 * "stretched" over the card with an ::after overlay, and anything that needs
 * its own click sits above it on `relative z-10`.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const saved = useStoreValue(() => isBookmarked(listing.id));
  const href = `/app/${listing.slug}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--border-strong)] sm:flex-row">
      {/* Demo video doubles as the cover, playing on hover */}
      <div className="shrink-0 sm:w-72">
        <ListingMedia src={listing.demoVideo} title={listing.title} rounded="rounded-none" />
      </div>

      <button
        aria-label={saved ? "Remove bookmark" : "Save for later"}
        onClick={() => toggleBookmark(listing.id)}
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface)]/85 text-[var(--muted)] backdrop-blur-sm transition-colors hover:text-[var(--foreground)]"
      >
        <HeartIcon filled={saved} />
      </button>

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold tracking-tight group-hover:text-[var(--accent)]">
          {/* The ::after overlay is what makes the whole row clickable */}
          <Link href={href} className="line-clamp-1 break-words after:absolute after:inset-0">
            {listing.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 break-words text-sm text-[var(--muted)]">
          {listing.tagline}
        </p>
        {/*
          `max-sm:hidden` rather than `hidden sm:block`: line-clamp works by
          setting `display: -webkit-box`, so a `sm:block` further down the
          cascade silently cancels it — which is why full descriptions were
          spilling down the page at desktop widths instead of clamping.
        */}
        <p className="mt-2 line-clamp-3 break-words text-sm leading-relaxed text-[var(--muted)]/75 max-sm:hidden">
          {listing.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
          <span className="text-base font-semibold tabular-nums">
            {formatPrice(listing.priceCents)}
          </span>
          <Link
            href={href}
            className="relative z-10 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            View details →
          </Link>
        </div>
        <span className="mt-2 text-xs text-[var(--muted)]">by {listing.sellerName}</span>
      </div>
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
