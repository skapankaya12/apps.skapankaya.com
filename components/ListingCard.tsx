"use client";

import Link from "next/link";
import type { Listing } from "@/lib/types";
import { formatPrice, isBookmarked, toggleBookmark } from "@/lib/store";
import { useStoreValue } from "@/lib/hooks";
import { ListingMedia } from "./ListingMedia";

/**
 * A listing as a horizontal list row: the demo video sits on the left (playing
 * on hover) with the details beside it. Stacks vertically on mobile.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const saved = useStoreValue(() => isBookmarked(listing.id));

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--border-strong)] sm:flex-row">
      {/* Demo video doubles as the cover, playing on hover */}
      <Link href={`/app/${listing.slug}`} className="block shrink-0 sm:w-72">
        <ListingMedia src={listing.demoVideo} title={listing.title} rounded="rounded-none" />
      </Link>

      <button
        aria-label={saved ? "Remove bookmark" : "Save for later"}
        onClick={() => toggleBookmark(listing.id)}
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface)]/85 text-[var(--muted)] backdrop-blur-sm transition-colors hover:text-[var(--foreground)]"
      >
        <HeartIcon filled={saved} />
      </button>

      <Link href={`/app/${listing.slug}`} className="flex min-w-0 flex-1 flex-col p-5">
        <h3 className="line-clamp-1 break-words text-lg font-semibold tracking-tight group-hover:text-[var(--accent)]">
          {listing.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 break-words text-sm text-[var(--muted)]">
          {listing.tagline}
        </p>
        <p className="mt-2 hidden line-clamp-2 break-words text-sm leading-relaxed text-[var(--muted)]/75 sm:block">
          {listing.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-base font-semibold tabular-nums">
            {formatPrice(listing.priceCents)}
          </span>
          <span className="text-xs text-[var(--muted)]">by {listing.sellerName}</span>
        </div>
      </Link>
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
