"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useStoreValue } from "@/lib/hooks";
import { getApprovedListings, getCategories } from "@/lib/store";
import type { Category, Listing } from "@/lib/types";
import { ListingCard } from "./ListingCard";

type Filter = Category | "all";

/**
 * The core "find a tool" experience: search + category chip filter + a vertical
 * list of listing rows. Shared by the landing page (below the hero) and /browse.
 *
 * `initial` is the catalogue read on the server, so the rows are in the HTML
 * for crawlers and the first paint.
 */
export function BrowseExperience({ initial = [] }: { initial?: Listing[] }) {
  const live = useStoreValue(getApprovedListings);
  const listings = live.length > 0 ? live : initial;
  const definedCategories = useStoreValue(getCategories);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Filter>("all");

  /**
   * An admin can retire a filter while someone is browsing it. The active chip
   * is derived rather than trusted, so a filter disappearing falls back to
   * "All tools" instead of leaving the visitor on a chip that no longer exists,
   * staring at an empty list with nothing highlighted.
   */
  const active: Filter =
    category === "all" || definedCategories.some((c) => c.id === category)
      ? category
      : "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      const matchesCat = active === "all" || l.category === active;
      const matchesQuery =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.tagline.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [listings, query, active]);

  /**
   * Show every department filter, always, so professionals see the full range
   * the marketplace covers even before it's filled out. Counts appear only when
   * a department has tools, so empty ones read as "coming soon" rather than "0".
   */
  const categories = useMemo(() => {
    const counts = new Map<Category, number>();
    listings.forEach((l) =>
      counts.set(l.category, (counts.get(l.category) ?? 0) + 1)
    );
    const all = definedCategories.map((c) => ({
      value: c.id as Filter,
      label: c.label,
      count: counts.get(c.id) ?? 0,
    }));
    return [
      { value: "all" as Filter, label: "All tools", count: listings.length },
      ...all,
    ];
  }, [listings, definedCategories]);

  const search = (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
        <SearchIcon />
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="What do you need to do? Try “clean a spreadsheet”, “make invoices”, “stay focused”…"
        className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] py-3.5 pl-11 pr-4 text-sm outline-none focus:border-[var(--accent)]"
      />
    </div>
  );

  const grid =
    filtered.length > 0 ? (
      <div className="flex flex-col gap-4">
        {filtered.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    ) : (
      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center">
        <p className="text-[var(--muted)]">
          Nothing matches “{query}” yet. Try different words, or{" "}
          <a href="/sell" className="text-[var(--accent)] hover:underline">
            build it and sell it
          </a>
          .
        </p>
      </div>
    );

  return (
    <div>
      {/*
        Reading ?q= is confined to a child that renders nothing, inside
        Suspense. That keeps useSearchParams from opting the whole route into
        dynamic rendering, so /browse stays a prerendered, CDN-served page —
        which matters, because time-to-first-byte is a ranking input.
      */}
      <Suspense fallback={null}>
        <QueryParamSync onQuery={setQuery} />
      </Suspense>

      {search}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          What are you working on?
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                active === c.value
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
              }`}
            >
              {c.label}
              {c.count > 0 && <span className="ml-1.5 opacity-60">{c.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">{grid}</div>
    </div>
  );
}

/**
 * Applies ?q= to the search box on mount. This is what makes a search result
 * shareable, and it's the URL the sitelinks SearchAction in the root layout
 * hands to Google.
 */
function QueryParamSync({ onQuery }: { onQuery: (q: string) => void }) {
  const q = useSearchParams().get("q") ?? "";
  useEffect(() => {
    if (q) onQuery(q);
  }, [q, onQuery]);
  return null;
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
