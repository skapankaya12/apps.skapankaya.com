"use client";

import { useState, useMemo } from "react";
import { useStoreValue } from "@/lib/hooks";
import { getApprovedListings } from "@/lib/store";
import { CATEGORY_LABELS, type Category } from "@/lib/types";
import { ListingCard } from "./ListingCard";

/**
 * The core "find a tool" experience: search + category filter + grid.
 * Shared by the landing page (inline, below the hero) and /browse.
 */
export function BrowseExperience() {
  const listings = useStoreValue(getApprovedListings);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      const matchesCat = category === "all" || l.category === category;
      const matchesQuery =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.tagline.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [listings, query, category]);

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
    const all = (Object.keys(CATEGORY_LABELS) as Category[]).map((c) => ({
      value: c as Category | "all",
      label: CATEGORY_LABELS[c],
      count: counts.get(c) ?? 0,
    }));
    return [
      { value: "all" as Category | "all", label: "All tools", count: listings.length },
      ...all,
    ];
  }, [listings]);

  return (
    <div>
      {/* Search, framed as "what problem do you have?" */}
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
                category === c.value
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

      {filtered.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center">
          <p className="text-[var(--muted)]">
            Nothing matches “{query}” yet. Try different words, or{" "}
            <a href="/sell" className="text-[var(--accent)] hover:underline">
              build it and sell it
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
