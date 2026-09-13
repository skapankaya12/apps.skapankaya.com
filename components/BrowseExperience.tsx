"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useStoreValue } from "@/lib/hooks";
import { getApprovedListings, getCategories } from "@/lib/store";
import {
  PLATFORM_LABELS,
  SYSTEMS,
  runsOn,
  type Category,
  type Listing,
  type System,
} from "@/lib/types";
import { ListingCard } from "./ListingCard";

type Filter = Category | "all";
type SystemFilter = System | "any";

const inCategory = (l: Listing, f: Filter) => f === "all" || l.category === f;
const onSystem = (l: Listing, f: SystemFilter) => f === "any" || runsOn(l).includes(f);

/**
 * The core "find a tool" experience: search, two rows of chips (what kind of
 * tool, and which system it runs on) and a vertical list of listing rows.
 * Shared by the landing page (below the hero) and /browse.
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
  const [system, setSystem] = useState<SystemFilter>("any");

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
      const matchesQuery =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.tagline.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        (l.otherCategory ?? "").toLowerCase().includes(q);
      return inCategory(l, active) && onSystem(l, system) && matchesQuery;
    });
  }, [listings, query, active, system]);

  /**
   * Show every category, always, so a maker sees the whole range of tools the
   * marketplace wants before it has filled out. Counts appear only when a
   * category has tools, so empty ones read as "coming soon" rather than "0".
   *
   * Each row counts within the other row's choice: with Windows picked, the
   * category counts are Windows tools, so a number never promises more than a
   * click on it shows.
   */
  const categories = useMemo(() => {
    const pool = listings.filter((l) => onSystem(l, system));
    const counts = new Map<Category, number>();
    pool.forEach((l) =>
      counts.set(l.category, (counts.get(l.category) ?? 0) + 1)
    );
    const all = definedCategories.map((c) => ({
      value: c.id as Filter,
      label: c.label,
      count: counts.get(c.id) ?? 0,
    }));
    return [
      { value: "all" as Filter, label: "All tools", count: pool.length },
      ...all,
    ];
  }, [listings, definedCategories, system]);

  const systems = useMemo(() => {
    const pool = listings.filter((l) => inCategory(l, active));
    return [
      { value: "any" as SystemFilter, label: "Any system", count: pool.length },
      ...SYSTEMS.map((s) => ({
        value: s as SystemFilter,
        label: PLATFORM_LABELS[s],
        count: pool.filter((l) => onSystem(l, s)).length,
      })),
    ];
  }, [listings, active]);

  const search = (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
        <SearchIcon />
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="What do you need to do? Try “convert a video”, “make invoices”, “practice a talk”…"
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
          {query.trim()
            ? <>Nothing matches “{query}” yet. Try different words, or{" "}</>
            : <>Nothing here yet. Try another filter, or{" "}</>}
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

      <ChipRow
        heading="What kind of tool?"
        chips={categories}
        active={active}
        onPick={setCategory}
      />
      <ChipRow
        heading="Runs on"
        chips={systems}
        active={system}
        onPick={setSystem}
      />

      <div className="mt-8">{grid}</div>
    </div>
  );
}

/** One labelled row of filter chips. */
function ChipRow<T extends string>({
  heading,
  chips,
  active,
  onPick,
}: {
  heading: string;
  chips: { value: T; label: string; count: number }[];
  active: T;
  onPick: (value: T) => void;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {heading}
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.value}
            onClick={() => onPick(c.value)}
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
