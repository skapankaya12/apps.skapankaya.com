"use client";

import { useState, useMemo } from "react";
import { useStoreValue } from "@/lib/hooks";
import { getApprovedListings } from "@/lib/store";
import { CATEGORY_LABELS, type Category } from "@/lib/types";
import { ListingCard } from "./ListingCard";

type Filter = Category | "all";

/**
 * The core "find a tool" experience: search + category filter + grid.
 * Shared by the landing page (inline chips, below the hero) and /browse
 * (a right-side department menu you navigate between).
 */
export function BrowseExperience({
  variant = "inline",
}: {
  /** "inline" = chip row (landing). "sidebar" = right-side filter menu (/browse). */
  variant?: "inline" | "sidebar";
}) {
  const listings = useStoreValue(getApprovedListings);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Filter>("all");

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
      value: c as Filter,
      label: CATEGORY_LABELS[c],
      count: counts.get(c) ?? 0,
    }));
    return [
      { value: "all" as Filter, label: "All tools", count: listings.length },
      ...all,
    ];
  }, [listings]);

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
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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

  /* ---------------------------- sidebar variant ---------------------------- */
  if (variant === "sidebar") {
    return (
      <div>
        {search}
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_260px]">
          {/* Main column: results */}
          <div className="lg:order-1">{grid}</div>

          {/* Right-side department menu */}
          <aside className="lg:order-2">
            <div className="lg:sticky lg:top-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Departments
              </p>
              <nav className="mt-1 flex flex-col gap-0.5">
                {categories.map((c) => {
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      aria-current={active ? "true" : undefined}
                      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                          : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <span className="truncate">{c.label}</span>
                      {c.count > 0 && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums ${
                            active
                              ? "bg-[var(--accent)] text-[var(--background)]"
                              : "bg-[var(--surface-muted)] text-[var(--muted)]"
                          }`}
                        >
                          {c.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* ----------------------------- inline variant ---------------------------- */
  return (
    <div>
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

      <div className="mt-8">{grid}</div>
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
