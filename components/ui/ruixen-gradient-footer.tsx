"use client";

// Gradient footer — a normal footer that sits at the bottom of the page.
// Its content reads first; the blurred glow is pinned to the bottom of the
// viewport and stretches up from the floor over the last stretch of scroll,
// hitting full height exactly when you reach the end of the page.
// One inline <svg> — no canvas, no giant scroll spacer.
//
// Gradient design inspired by Dia Browser — https://www.diabrowser.com
//
// Adapted for this site:
//  - The palette is ours, not a rainbow. See SOLO_STOPS below.
//  - Scroll updates write straight to the DOM instead of through React state,
//    so dragging the scrollbar doesn't re-render the whole footer per frame.
//  - prefers-reduced-motion drops the scroll coupling entirely and renders the
//    glow as a static band inside the footer, so those visitors still get the
//    design, just without the movement.

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Stop = { offset: number; color: string };

const VBW = 1271;
const VBH = 599;

/**
 * Ours, floor (0) → top (1): a deep indigo floor that grounds the page, up
 * through --accent, into the periwinkle tints, and out through --accent-soft
 * to nothing. Monochrome on purpose — the site is light-only with one
 * confident accent, and a multi-hue rainbow would be the loudest thing on it.
 *
 * The two anchors are exact tokens from globals.css: #4f46e5 is --accent and
 * #eef0ff is --accent-soft. Everything between them is a tint of the same hue,
 * so the glow can never drift out of brand.
 */
export const SOLO_STOPS: Stop[] = [
  { offset: 0, color: "#2B2673" },
  { offset: 0.16, color: "#4F46E5" },
  { offset: 0.32, color: "#6D5DF0" },
  { offset: 0.48, color: "#8B7BF5" },
  { offset: 0.64, color: "#A5B4FC" },
  { offset: 0.8, color: "#D9DFFE" },
  { offset: 0.92, color: "#EEF0FF" },
  { offset: 1, color: "#EEF0FF00" },
];

/**
 * The same ramp with the dark floor taken out — starts at --accent and stays
 * pale. Use it where a deep band at the bottom of the screen would feel heavy
 * (the dashboard, checkout), or if the default reads as too much on a white
 * page. Pass it as `stops={SOLO_SOFT_STOPS}`.
 */
export const SOLO_SOFT_STOPS: Stop[] = [
  { offset: 0, color: "#4F46E5" },
  { offset: 0.2, color: "#7C6BF2" },
  { offset: 0.42, color: "#A5B4FC" },
  { offset: 0.66, color: "#C7D2FE" },
  { offset: 0.86, color: "#EEF0FF" },
  { offset: 1, color: "#EEF0FF00" },
];

// Height curve: a gentle power falloff, giving a flatter, pyramid-like rise
// (short edges, tallest middle).
function bellHeights(n: number, peak: number, valley: number): number[] {
  const out: number[] = [];
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const t = mid === 0 ? 0 : Math.abs(i - mid) / mid; // 0 center → 1 edge
    const eased = 1 - Math.pow(t, 1.24);
    out.push(peak * VBH * (valley + (1 - valley) * eased));
  }
  return out;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export interface RuixenGradientFooterProps {
  /** Footer content — links, wordmark, copyright — shown above the glow. */
  children?: ReactNode;
  /**
   * Height of the glow band pinned to the viewport bottom. Doubles as the
   * scroll distance the reveal takes, and the room reserved under the content.
   */
  gradientHeight?: string;
   /**
   * Resting height of the glow, as a fraction of the band — a thin, flat strip
   * along the bottom edge before the scroll reveal starts.
   *
   * Defaults to 0 here, unlike upstream. The band is fixed to the viewport, so
   * any resting height puts a saturated indigo bar along the bottom of every
   * page in the site — browse, checkout, dashboard, admin — where it reads as
   * chrome rather than decoration. At 0 the glow belongs to the footer alone.
   * Try 0.04 if you want the strip back.
   */
  minReveal?: number;
  /** Number of blurred columns. */
  bars?: number;
  /** Blur in viewBox units. */
  blur?: number;
  /** Peak height as a fraction of the viewBox. */
  peak?: number;
  /** Edge height as a fraction of the peak (0..1). */
  valley?: number;
  /** Vertical gradient stops, floor (0) → top (1). */
  stops?: Stop[];
  className?: string;
  style?: CSSProperties;
}

export function RuixenGradientFooter({
  children,
  gradientHeight = "38vh",
  minReveal = 0,
  bars = 9,
  blur = 15,
  peak = 0.98,
  valley = 0.55,
  stops = SOLO_STOPS,
  className,
  style,
}: RuixenGradientFooterProps) {
  const uid = useId().replace(/:/g, "");
  const bandRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = bandRef.current;
    if (!el || reduced) return;

    // Bind to the element's OWN window so this tracks the right scroll context
    // on a real page and inside an embedded preview alike.
    const doc = el.ownerDocument;
    const win = doc.defaultView ?? window;

    // Written straight to the node. Routing this through setState re-rendered
    // the whole footer — every link, every column — on every scroll event.
    let frame = 0;
    const apply = () => {
      frame = 0;
      // offsetHeight ignores the transform, so the band can measure itself.
      const h = el.offsetHeight || 1;
      // How much scroll is left before the end of the page. The glow starts
      // rising once that's within its own height, and is full at the bottom.
      const left =
        doc.documentElement.scrollHeight - win.innerHeight - win.scrollY;
      const t = clamp01((h - left) / h);
      el.style.transform = `scaleY(${minReveal + (1 - minReveal) * t})`;
    };
    const schedule = () => {
      if (!frame) frame = win.requestAnimationFrame(apply);
    };

    apply();
    win.addEventListener("scroll", schedule, { passive: true });
    win.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame) win.cancelAnimationFrame(frame);
      win.removeEventListener("scroll", schedule);
      win.removeEventListener("resize", schedule);
    };
  }, [minReveal, reduced]);

  const colW = VBW / bars;

  const glow = (
    <svg
      style={{ height: "100%", width: "100%", display: "block" }}
      viewBox={`0 0 ${VBW} ${VBH}`}
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`grad-${uid}`} x1="0" y1="1" x2="0" y2="0">
          {stops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <filter id={`blur-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
      </defs>
      {bellHeights(bars, peak, valley).map((barH, i) => (
        <g key={i} filter={`url(#blur-${uid})`}>
          <rect
            x={i * colW}
            y={VBH - barH}
            width={colW * 1.23}
            height={barH}
            fill={`url(#grad-${uid})`}
          />
        </g>
      ))}
    </svg>
  );

  return (
    // The glow is pinned to the viewport, so the footer reserves the same
    // height beneath its content for the glow to land in.
    <footer
      className={className}
      style={{
        paddingBottom: gradientHeight,
        // Only needed for the reduced-motion band, which is absolute rather
        // than fixed. Harmless otherwise: `relative` does not capture `fixed`.
        position: "relative",
        ...style,
      }}
    >
      {children}

      {reduced ? (
        // No scroll coupling at all — the glow simply fills the space the
        // footer already reserved for it.
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: gradientHeight,
            pointerEvents: "none",
          }}
        >
          {glow}
        </div>
      ) : (
        // Fixed to the viewport — a transformed or filtered ancestor would
        // capture it, so the footer keeps a plain containing block.
        <div
          ref={bandRef}
          aria-hidden
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            height: gradientHeight,
            pointerEvents: "none",
            transformOrigin: "bottom",
            transform: `scaleY(${minReveal})`,
            willChange: "transform",
          }}
        >
          {glow}
        </div>
      )}
    </footer>
  );
}
