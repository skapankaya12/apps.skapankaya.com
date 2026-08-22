"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Collapses tall content behind a "Read more" button.
 *
 * Sellers write long descriptions — the good ones run to a screen or three of
 * headings and lists — and on a phone that buries the price, the seller and the
 * buy button under a wall of prose nobody scrolls past.
 *
 * Every child is always rendered; collapsing is a max-height on the wrapper.
 * That matters beyond tidiness: the listing page is server-rendered for search
 * and AI crawlers, and slicing the text down to a preview would mean shipping a
 * truncated description in the HTML. Here the full text is always in the
 * document, just clipped visually.
 *
 * The button only appears when there is genuinely something hidden, measured
 * after layout rather than guessed from character count — a description's
 * height depends on wrapping, which depends on the viewport.
 */
export function Expandable({
  children,
  collapsedHeight = 320,
  moreLabel = "Read more",
  lessLabel = "Show less",
}: {
  children: React.ReactNode;
  /** Visible height while collapsed, in px. */
  collapsedHeight?: number;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A small tolerance: clipping the last two pixels of a descender isn't
    // worth a "Read more" that reveals nothing.
    const check = () => setOverflows(el.scrollHeight > collapsedHeight + 24);
    check();
    // Re-measure on resize (rotating a phone re-wraps everything) and on font
    // load, which changes line heights after first paint.
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [collapsedHeight, children]);

  const collapsed = overflows && !expanded;

  return (
    <div>
      <div className="relative">
        <div
          ref={ref}
          style={collapsed ? { maxHeight: collapsedHeight } : undefined}
          className={collapsed ? "overflow-hidden" : undefined}
        >
          {children}
        </div>
        {collapsed && (
          // Fades the clipped edge instead of guillotining a line of text, so
          // it reads as "there's more" rather than as a rendering bug.
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--background)] to-transparent"
          />
        )}
      </div>

      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
        >
          {expanded ? lessLabel : moreLabel}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={expanded ? "rotate-180" : undefined}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
