"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { kindLabel, searchFeed, type FeedItem } from "@/lib/feed";
import { BotAvatar } from "./GrokBotAvatar";
import { FeedThumb } from "./FeedThumb";

/**
 * The guide: a small pop-up that asks what you want to get done and searches
 * the feed as you type. It opens by itself once per visit, five seconds in,
 * and again from "Help me choose". It only ever searches the cards on the page.
 *
 * Each suggestion fills the box with a word the search actually finds, not
 * the suggestion's own wording: "Clean up my inbox" would need every word to
 * match, and almost nothing says "clean".
 */
type Side = "work" | "life";

const SUGGESTIONS: Record<Side, { label: string; query: string }[]> = {
  work: [
    { label: "Clean up my inbox", query: "inbox" },
    { label: "Find new leads", query: "leads" },
    { label: "Write my newsletter", query: "newsletter" },
    { label: "Run my social media", query: "social" },
    { label: "Fix bugs faster", query: "bug" },
    { label: "Hire someone", query: "hire" },
    { label: "Sell what I built", query: "sell" },
    { label: "A chief of staff", query: "chief of staff" },
  ],
  life: [
    { label: "Plan my meals", query: "meal" },
    { label: "Get fit", query: "fitness" },
    { label: "Track my budget", query: "budget" },
    { label: "Plan a trip", query: "trip" },
    { label: "Find a job", query: "job" },
    { label: "Help my kids learn", query: "kids" },
    { label: "Find a good deal", query: "deal" },
    { label: "Protect my privacy", query: "privacy" },
  ],
};

const PREVIEW = 4;

export function FeedGuide({
  items,
  intro,
  bots = false,
  onClose,
  onApply,
}: {
  items: FeedItem[];
  /** Opened from the Grok Bots view: the guide wears a bot's face there. */
  bots?: boolean;
  /** One line under the guide's name, saying what it can find on this page. */
  intro: string;
  onClose: () => void;
  /** Apply a search to the page, optionally jumping to one card in the results. */
  onApply: (query: string, itemId?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [side, setSide] = useState<Side>("work");
  const [shown, setShown] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchFeed(items, query), [items, query]);
  const hasQuery = query.trim().length > 0;

  // Fade in on the frame after mounting, and focus the box so typing starts
  // straight away. Escape closes it, as every pop-up should.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const t = setTimeout(() => input.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function apply(itemId?: string) {
    onApply(query.trim(), itemId);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 sm:items-center sm:p-6 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--background)] p-6 shadow-[var(--shadow-lg)] transition-transform duration-200 sm:max-w-lg sm:rounded-3xl sm:p-7 ${
          shown ? "translate-y-0" : "translate-y-4"
        }`}
      >
        <div className="flex items-start gap-4">
          <GuideIcon bots={bots} className="h-12 w-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 id="guide-title" className="text-lg font-semibold tracking-tight">
              Hi, I&apos;m the guide
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{intro}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (hasQuery) apply();
          }}
        >
          <label htmlFor="guide-q" className="text-sm font-medium">
            What do you want to get done?
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[var(--border-strong)] px-4 focus-within:border-[var(--foreground)] focus-within:shadow-[0_0_0_3px_var(--ring)]">
            <SearchIcon />
            <input
              ref={input}
              id="guide-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="inbox, meals, files, pricing..."
              autoComplete="off"
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--muted)]/70 focus-visible:shadow-none!"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  input.current?.focus();
                }}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {!hasQuery ? (
          <div className="mt-5">
            <div className="flex gap-1 text-sm" role="tablist" aria-label="Work or life">
              {(["work", "life"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={side === s}
                  onClick={() => setSide(s)}
                  className={`rounded-full px-3 py-1 ${
                    side === s
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {s === "work" ? "For work" : "For life"}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS[side].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setQuery(s.query);
                    input.current?.focus();
                  }}
                  className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-sm hover:border-[var(--foreground)]"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--muted)]">
            Nothing matches that yet. Try one simple word, like inbox, meals or files.
          </p>
        ) : (
          <div className="mt-5">
            <p className="text-sm text-[var(--muted)]">
              {results.length === 1 ? "One thing fits." : `${results.length} things fit. Here are the closest.`}
            </p>
            <ul className="mt-2 divide-y divide-[var(--border)]">
              {results.slice(0, PREVIEW).map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => apply(it.id)}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <FeedThumb item={it} className="h-10 w-10 shrink-0 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{it.title}</span>
                      <span className="block truncate text-sm text-[var(--muted)]">{it.summary}</span>
                    </span>
                    <span className="hidden shrink-0 text-xs text-[var(--muted)] sm:block">{kindLabel(it.kind)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => apply()}
              className="mt-4 w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-medium text-[var(--background)]"
            >
              {results.length === 1 ? "Show it" : `Show all ${results.length}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The guide's face. A compass on the brand's dark red everywhere, and a Grok
 * Bot only on the Grok Bots view, so the bot look stays with the bots.
 */
export function GuideIcon({ bots = false, className = "h-8 w-8" }: { bots?: boolean; className?: string }) {
  if (bots) return <BotAvatar id="guide" motion="blink" className={className} />;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8b1a1a] to-[#c25555] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5" opacity="0.55" />
        <path d="M15.6 8.4 13.4 13.4 8.4 15.6 10.6 10.6z" fill="currentColor" stroke="none" className="origin-center transition-transform duration-500 group-hover/guide:rotate-[25deg]" />
      </svg>
    </span>
  );
}

export function SearchIcon({ className = "h-4 w-4 shrink-0 text-[var(--muted)]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.2 13.2 17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
