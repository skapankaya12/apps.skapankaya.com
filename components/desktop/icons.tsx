/**
 * Every icon on the desktop, drawn for this site in the style of a Mac.
 *
 * The style is borrowed: the squircle tile, light from above, objects with
 * depth that cast a shadow on their tile, folders with a symbol pressed into
 * the front. The artwork is not: no Apple logo, no Apple app icon, no SF
 * Symbol, no system font file. Each drawing here is our own, so it can ship
 * on a public website.
 *
 * What makes a Mac icon read as one, and a flat web icon not: three layers of
 * light. A gradient on the tile, a soft highlight across its top and a darker
 * bottom edge; a bright hairline rim; and an object inside with its own
 * shading and a shadow underneath. Every tile below has all three.
 */

import { useId, type ReactNode } from "react";
import type { AisleGlyph } from "@/lib/desktop";

/* ---------------------------------------------------------------- squircle */

/**
 * The tile shape of a modern Mac icon: a superellipse, not a rounded square.
 * Its corners ease into the straight edges instead of meeting them at a point,
 * which is most of why a plain rounded rectangle reads as "a web button".
 * Computed once, in a 100 unit box with the tile inset to 82, like the
 * standard icon grid.
 */
function superellipse(cx: number, cy: number, r: number, n = 5, steps = 120) {
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = cx + r * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = cy + r * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

const SQUIRCLE = superellipse(50, 50, 41);

/**
 * The tile every app icon sits on. `id` comes from useId so two copies of the
 * same icon (the Dock and a menu, say) never share gradient ids: a gradient
 * referenced from a hidden copy draws nothing in some browsers.
 */
function Tile({
  from,
  to,
  children,
  size,
  label,
}: {
  from: string;
  to: string;
  children: (id: string) => ReactNode;
  size: number;
  label?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <radialGradient id={`${id}top`} cx="50%" cy="0%" r="75%" fx="50%" fy="0%">
          <stop offset="0" stopColor="#fff" stopOpacity=".42" />
          <stop offset=".55" stopColor="#fff" stopOpacity=".06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}low`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".72" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".16" />
        </linearGradient>
        <linearGradient id={`${id}rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".75" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".12" />
          <stop offset="1" stopColor="#fff" stopOpacity=".05" />
        </linearGradient>
        <clipPath id={`${id}clip`}>
          <path d={SQUIRCLE} />
        </clipPath>
        <filter id={`${id}drop`} x="-25%" y="-20%" width="150%" height="160%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodColor="#000" floodOpacity=".22" />
          <feDropShadow dx="0" dy="4" stdDeviation="3.6" floodColor="#000" floodOpacity=".2" />
        </filter>
        {/* The shadow an object casts on its own tile. */}
        <filter id={`${id}obj`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity=".28" />
        </filter>
      </defs>
      <path d={SQUIRCLE} fill={`url(#${id}g)`} filter={`url(#${id}drop)`} />
      <g clipPath={`url(#${id}clip)`}>
        <rect width="100" height="100" fill={`url(#${id}top)`} />
        {children(id)}
        <rect width="100" height="100" fill={`url(#${id}low)`} />
      </g>
      <path d={SQUIRCLE} fill="none" stroke={`url(#${id}rim)`} strokeWidth="1.1" />
      <path d={SQUIRCLE} fill="none" stroke="#000" strokeOpacity=".14" strokeWidth=".5" />
    </svg>
  );
}

/* --------------------------------------------------------------- app icons */

export type Glyph =
  | "market"
  | "launchpad"
  | "pages"
  | "free"
  | "video"
  | "notes"
  | "blog"
  | "library"
  | "saved"
  | "sell"
  | "about";

/** A rounded square with its own top light, for small tiles inside icons. */
function Chip({ x, y, s, color, id, k }: { x: number; y: number; s: number; color: string; id: string; k: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".38" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={s} height={s} rx={s * 0.28} fill={color} />
      <rect x={x} y={y} width={s} height={s} rx={s * 0.28} fill={`url(#${id}${k})`} />
      <rect x={x + 0.4} y={y + 0.4} width={s - 0.8} height={s - 0.8} rx={s * 0.26} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth=".6" />
    </g>
  );
}

export function AppIcon({ g, size = 48, label }: { g: Glyph; size?: number; label?: string }) {
  switch (g) {
    case "market":
    case "about":
      // Our own four tiles, lifted off a white tile, the logo as an app.
      return (
        <Tile from="#ffffff" to="#e4e8f1" size={size} label={label}>
          {(id) => (
            <g filter={`url(#${id}obj)`}>
              <Chip id={id} k="a" x={26} y={26} s={22} color="#2f8bff" />
              <Chip id={id} k="b" x={52} y={26} s={22} color="#4b6bf6" />
              <Chip id={id} k="c" x={26} y={52} s={22} color="#5a5df2" />
              <Chip id={id} k="d" x={52} y={52} s={22} color="#6a4bf0" />
            </g>
          )}
        </Tile>
      );

    case "launchpad": {
      const c = ["#ff5f57", "#ffbd2e", "#34c759", "#32ade6", "#5e5ce6", "#ff6fae", "#ff9f0a", "#30d158", "#64d2ff"];
      return (
        <Tile from="#4b505e" to="#1d2028" size={size} label={label}>
          {(id) => (
            <g filter={`url(#${id}obj)`}>
              {c.map((col, i) => (
                <Chip key={col} id={id} k={`l${i}`} x={25.5 + (i % 3) * 17.5} y={25.5 + Math.floor(i / 3) * 17.5} s={13} color={col} />
              ))}
            </g>
          )}
        </Tile>
      );
    }

    case "pages":
      // A glass globe on a pale tile.
      return (
        <Tile from="#ffffff" to="#e6ebf3" size={size} label={label}>
          {(id) => (
            <>
              <defs>
                <radialGradient id={`${id}ball`} cx="38%" cy="32%" r="72%">
                  <stop offset="0" stopColor="#8fdcff" />
                  <stop offset=".55" stopColor="#2f8ff0" />
                  <stop offset="1" stopColor="#1650c4" />
                </radialGradient>
                <radialGradient id={`${id}gloss`} cx="40%" cy="22%" r="45%">
                  <stop offset="0" stopColor="#fff" stopOpacity=".75" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <clipPath id={`${id}globe`}>
                  <circle cx="50" cy="50" r="27" />
                </clipPath>
              </defs>
              <g filter={`url(#${id}obj)`}>
                <circle cx="50" cy="50" r="27" fill={`url(#${id}ball)`} />
              </g>
              <g clipPath={`url(#${id}globe)`} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6">
                <ellipse cx="50" cy="50" rx="12" ry="27" />
                <path d="M50 23v54M23 50h54" />
                <path d="M26 37c15 5 33 5 48 0M26 63c15-5 33-5 48 0" />
              </g>
              <circle cx="50" cy="50" r="27" fill={`url(#${id}gloss)`} />
              <circle cx="50" cy="50" r="26.5" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth=".8" />
            </>
          )}
        </Tile>
      );

    case "free":
      // An open kraft box on green: free things, given away.
      return (
        <Tile from="#7fe08f" to="#26a148" size={size} label={label}>
          {(id) => (
            <>
              <defs>
                <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#e4b97c" />
                  <stop offset="1" stopColor="#c48f4f" />
                </linearGradient>
                <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#cf9f5f" />
                  <stop offset="1" stopColor="#a8763a" />
                </linearGradient>
              </defs>
              <g filter={`url(#${id}obj)`}>
                <path d="M24 44l26 12v24L24 68z" fill={`url(#${id}l)`} />
                <path d="M76 44L50 56v24l26-12z" fill={`url(#${id}r)`} />
                <path d="M24 44l26-11 26 11-26 12z" fill="#6b4a22" />
                {/* Flaps, opened out */}
                <path d="M24 44l-6-10 25-9 7 8z" fill="#efcf9c" />
                <path d="M76 44l6-10-25-9-7 8z" fill="#e6c08a" />
                <path d="M50 56l-8 10-24-11 6-11z" fill="#f2d7a8" />
              </g>
              <path d="M50 56v24" stroke="#8a5f2c" strokeOpacity=".5" strokeWidth=".8" />
            </>
          )}
        </Tile>
      );

    case "video":
      // A clapperboard: black slate, striped clapper, a play mark.
      return (
        <Tile from="#ffa36b" to="#ee4d29" size={size} label={label}>
          {(id) => (
            <>
              <defs>
                <linearGradient id={`${id}slate`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#3a3a42" />
                  <stop offset="1" stopColor="#141418" />
                </linearGradient>
                <pattern id={`${id}stripe`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
                  <rect width="5" height="10" fill="#fff" />
                  <rect x="5" width="5" height="10" fill="#1c1c22" />
                </pattern>
              </defs>
              <g filter={`url(#${id}obj)`}>
                <rect x="24" y="41" width="52" height="35" rx="5" fill={`url(#${id}slate)`} />
                <g transform="rotate(-9 24 38)">
                  <rect x="24" y="29" width="52" height="10" rx="2.5" fill={`url(#${id}stripe)`} />
                </g>
                <rect x="24" y="40" width="52" height="7" fill={`url(#${id}stripe)`} />
              </g>
              <path d="M45 52l14 8.5-14 8.5z" fill="#fff" />
              <rect x="24.5" y="41.5" width="51" height="34" rx="4.6" fill="none" stroke="#fff" strokeOpacity=".18" />
            </>
          )}
        </Tile>
      );

    case "notes":
      // A pad of paper with a yellow top, the way a notes app looks.
      return (
        <Tile from="#ffffff" to="#f1f1ef" size={size} label={label}>
          {(id) => (
            <>
              <defs>
                <linearGradient id={`${id}pad`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffdd55" />
                  <stop offset="1" stopColor="#f7bf22" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="100" height="32" fill={`url(#${id}pad)`} />
              <path d="M0 32h100" stroke="#000" strokeOpacity=".12" strokeWidth="1" />
              <path d="M9 33.5h82" stroke="#b9b9b9" strokeDasharray="1.2 2.2" strokeWidth="1" />
              <path d="M22 47h56M22 57h56M22 67h56M22 77h38" stroke="#cfd0d4" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </Tile>
      );

    case "blog":
      // A sheet of writing with a pencil across it.
      return (
        <Tile from="#5b6ea8" to="#25335f" size={size} label={label}>
          {(id) => (
            <>
              <defs>
                <linearGradient id={`${id}wood`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#ffd36b" />
                  <stop offset=".5" stopColor="#f6b73c" />
                  <stop offset="1" stopColor="#d9921e" />
                </linearGradient>
              </defs>
              <g filter={`url(#${id}obj)`}>
                <rect x="27" y="22" width="42" height="56" rx="3.5" fill="#fbfbfd" />
              </g>
              <path d="M34 35h28M34 43h28M34 51h20" stroke="#c4c8d4" strokeWidth="2.2" strokeLinecap="round" />
              <g transform="rotate(-38 58 62)" filter={`url(#${id}obj)`}>
                <rect x="38" y="57.5" width="34" height="9" fill={`url(#${id}wood)`} />
                <rect x="72" y="57.5" width="6" height="9" rx="1.2" fill="#ef8aa0" />
                <rect x="70" y="57.5" width="3" height="9" fill="#c9ccd4" />
                <path d="M38 57.5l-9 4.5 9 4.5z" fill="#f1d9b0" />
                <path d="M31.5 60.8L29 62l2.5 1.2z" fill="#333" />
              </g>
            </>
          )}
        </Tile>
      );

    case "library":
      // Three books on a shelf: what you own stays here.
      return (
        <Tile from="#f6f1ea" to="#e0d6c6" size={size} label={label}>
          {(id) => (
            <>
              <defs>
                <linearGradient id={`${id}spine`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#000" stopOpacity=".18" />
                  <stop offset=".35" stopColor="#fff" stopOpacity=".18" />
                  <stop offset="1" stopColor="#000" stopOpacity=".12" />
                </linearGradient>
              </defs>
              <g filter={`url(#${id}obj)`}>
                <rect x="25" y="28" width="13" height="46" rx="2" fill="#6a4bf0" />
                <rect x="40" y="33" width="12" height="41" rx="2" fill="#2f8bff" />
                <rect x="58" y="29" width="13" height="46" rx="2" fill="#ff6b5b" transform="rotate(16 58 75)" />
              </g>
              <rect x="25" y="28" width="13" height="46" rx="2" fill={`url(#${id}spine)`} />
              <rect x="40" y="33" width="12" height="41" rx="2" fill={`url(#${id}spine)`} />
              <path d="M25 36h13M25 66h13M40 41h12M40 66h12" stroke="#ffd36b" strokeWidth="1.6" />
              <rect x="20" y="74" width="60" height="5" rx="1.5" fill="#a77a4c" />
              <rect x="20" y="74" width="60" height="1.6" fill="#c99a68" />
            </>
          )}
        </Tile>
      );

    case "saved":
      // A glossy heart on white.
      return (
        <Tile from="#ffffff" to="#eceff4" size={size} label={label}>
          {(id) => (
            <>
              <defs>
                <radialGradient id={`${id}heart`} cx="40%" cy="30%" r="80%">
                  <stop offset="0" stopColor="#ff8aa3" />
                  <stop offset=".55" stopColor="#ff3b62" />
                  <stop offset="1" stopColor="#d10f3d" />
                </radialGradient>
              </defs>
              <g filter={`url(#${id}obj)`}>
                <path d="M50 76S24 61 24 42.5a13 13 0 0 1 26-5 13 13 0 0 1 26 5C76 61 50 76 50 76z" fill={`url(#${id}heart)`} />
              </g>
              <ellipse cx="38" cy="38" rx="7" ry="4.5" fill="#fff" opacity=".55" transform="rotate(-30 38 38)" />
            </>
          )}
        </Tile>
      );

    case "sell":
      // A paper price tag on its string.
      return (
        <Tile from="#5ee3cb" to="#0e8f84" size={size} label={label}>
          {(id) => (
            <>
              <defs>
                <linearGradient id={`${id}tag`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#dde4ea" />
                </linearGradient>
              </defs>
              <path d="M30 25c-8 3-10 12-3 17" fill="none" stroke="#f7f1e3" strokeWidth="1.6" strokeLinecap="round" />
              <g filter={`url(#${id}obj)`}>
                <path d="M33 30h20l22 22-21 21-22-22V30z" fill={`url(#${id}tag)`} />
              </g>
              <circle cx="40" cy="38" r="3.6" fill="#0e8f84" />
              <circle cx="40" cy="38" r="3.6" fill="none" stroke="#000" strokeOpacity=".15" />
              <text x="55" y="61" textAnchor="middle" fontSize="17" fontWeight="800" fill="#0e8f84" fontFamily="-apple-system, system-ui, sans-serif" transform="rotate(45 55 56)">
                $
              </text>
            </>
          )}
        </Tile>
      );
  }
}

/* ------------------------------------------------------------ aisle glyphs */

/** One-line symbols on a 24 grid, used pressed into folders and in sidebars. */
export function AisleSymbol({ name, size = 16, className }: { name: AisleGlyph; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <SymbolPath name={name} />
    </svg>
  );
}

function SymbolPath({ name }: { name: AisleGlyph }) {
  switch (name) {
    case "globe":
      return <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9s1.2-6.4 3.7-9z" />;
    case "wrench":
      return <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5zM14.5 6.5l3-3a4 4 0 0 1 3 3l-3 3" />;
    case "layout":
      return <path d="M4 5h16v14H4zM4 10h16M10 10v9" />;
    case "puzzle":
      return <path d="M5 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v3H5v-3a2 2 0 1 0 0-4z" />;
    case "box":
      return <path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8" />;
    case "bulb":
      return <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />;
    case "film":
      return <path d="M4 6h16v12H4zM10 9.5l5 2.5-5 2.5z" />;
    case "photo":
      return <path d="M4 6h16v12H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5h.01" />;
    case "gift":
      return <path d="M4 10h16v3H4zM5 13h14v7H5zM12 10v10M12 10c-1-3-5-4-5-1.5S12 10 12 10zm0 0c1-3 5-4 5-1.5S12 10 12 10z" />;
    case "chart":
      return <path d="M5 19V11M10 19V6M15 19v-5M20 19V9M3 19h18" />;
    case "case":
      return <path d="M4 8h16v11H4zM9 8V5h6v3M4 13h16" />;
  }
}

/* ------------------------------------------------------------------ folder */

/**
 * A Mac-style folder: a darker back panel with its tab, a paler front with a
 * light catching its top edge, and the aisle's symbol pressed into the front
 * the way special folders carry theirs.
 */
export function FolderIcon({ glyph, size = 64 }: { glyph?: AisleGlyph; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 100 82" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}back`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4aa6ec" />
          <stop offset="1" stopColor="#2f86d6" />
        </linearGradient>
        <linearGradient id={`${id}front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ed8ff" />
          <stop offset=".12" stopColor="#86ccfb" />
          <stop offset="1" stopColor="#5cb2f2" />
        </linearGradient>
        <linearGradient id={`${id}lip`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}drop`} x="-10%" y="-10%" width="120%" height="135%">
          <feDropShadow dx="0" dy="1" stdDeviation=".8" floodColor="#00264d" floodOpacity=".25" />
          <feDropShadow dx="0" dy="3" stdDeviation="2.6" floodColor="#00264d" floodOpacity=".2" />
        </filter>
      </defs>
      <g filter={`url(#${id}drop)`}>
        <path d="M6 13a6 6 0 0 1 6-6h21.5a6 6 0 0 1 4.3 1.8l4.4 4.6H88a6 6 0 0 1 6 6V69a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6z" fill={`url(#${id}back)`} />
        {/* A sheet of paper peeking out, the way a full folder looks. */}
        <rect x="12" y="17" width="76" height="20" rx="2" fill="#f4f8fc" />
        <path d="M6 26.5a6 6 0 0 1 6-6h76a6 6 0 0 1 6 6V69a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6z" fill={`url(#${id}front)`} />
      </g>
      <path d="M12 21h76" stroke={`url(#${id}lip)`} strokeWidth="1.6" strokeLinecap="round" />
      {glyph && (
        <g transform="translate(36.8 34.5) scale(1.1)">
          {/* Pressed in: a light edge below, the symbol in a deeper blue above. */}
          <g transform="translate(0 .7)" stroke="#d3eeff" strokeOpacity=".95" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <SymbolPath name={glyph} />
          </g>
          <g stroke="#3c8ed6" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <SymbolPath name={glyph} />
          </g>
        </g>
      )}
    </svg>
  );
}

/** A plain text file, for README.txt. */
export function DocIcon({ size = 64 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 80 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1f3f7" />
        </linearGradient>
        <filter id={`${id}d`} x="-20%" y="-10%" width="140%" height="125%">
          <feDropShadow dx="0" dy="1" stdDeviation=".8" floodOpacity=".25" />
          <feDropShadow dx="0" dy="3" stdDeviation="2.4" floodOpacity=".18" />
        </filter>
      </defs>
      <g filter={`url(#${id}d)`}>
        <path d="M12 6h38l18 18v68a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill={`url(#${id}p)`} />
        <path d="M50 6v15a3 3 0 0 0 3 3h15z" fill="#e2e6ee" />
      </g>
      <path d="M20 40h40M20 48h40M20 56h40M20 64h26" stroke="#c3c8d3" strokeWidth="2" strokeLinecap="round" />
      <text x="39" y="85" textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing=".5" fill="#9aa0ad" fontFamily="-apple-system, system-ui, sans-serif">
        TXT
      </text>
    </svg>
  );
}

/** An installer package: a kraft parcel with tape. */
export function PackageIcon({ size = 64 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2bb82" />
          <stop offset="1" stopColor="#bf8e4f" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfa064" />
          <stop offset="1" stopColor="#a5773e" />
        </linearGradient>
        <filter id={`${id}d`} x="-10%" y="-10%" width="120%" height="135%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodOpacity=".25" />
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity=".2" />
        </filter>
      </defs>
      <g filter={`url(#${id}d)`}>
        <path d="M14 32l36-16 36 16-36 16z" fill="#eed5a8" />
        <path d="M14 32l36 16v40L14 72z" fill={`url(#${id}l)`} />
        <path d="M86 32L50 48v40l36-16z" fill={`url(#${id}r)`} />
      </g>
      <path d="M32 24l36 16v10l-6 3V43L26 27z" fill="#f8eedb" />
      <path d="M50 48v40" stroke="#7d5627" strokeOpacity=".4" />
      <path d="M14 32l36 16 36-16" fill="none" stroke="#fff" strokeOpacity=".35" />
    </svg>
  );
}

/**
 * The bin, a frosted mesh can, labelled Subscriptions. Drawn see-through: a
 * pale body, perforations, a bright rim and a dark mouth.
 */
export function BinIcon({ size = 48 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c7ccd6" stopOpacity=".92" />
          <stop offset=".3" stopColor="#f4f6fa" stopOpacity=".85" />
          <stop offset=".62" stopColor="#ffffff" stopOpacity=".7" />
          <stop offset="1" stopColor="#b7bdc9" stopOpacity=".95" />
        </linearGradient>
        <pattern id={`${id}holes`} width="4.2" height="4.2" patternUnits="userSpaceOnUse">
          <circle cx="2.1" cy="2.1" r=".9" fill="#7d8494" fillOpacity=".4" />
        </pattern>
        <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d5d9e1" />
          <stop offset=".5" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c3c8d2" />
        </linearGradient>
        <filter id={`${id}d`} x="-15%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodOpacity=".25" />
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity=".18" />
        </filter>
        <clipPath id={`${id}c`}>
          <path d="M23 20h54l-5.4 69a5 5 0 0 1-5 4.6H33.4a5 5 0 0 1-5-4.6z" />
        </clipPath>
      </defs>
      <g filter={`url(#${id}d)`}>
        <path d="M23 20h54l-5.4 69a5 5 0 0 1-5 4.6H33.4a5 5 0 0 1-5-4.6z" fill={`url(#${id}body)`} />
      </g>
      <g clipPath={`url(#${id}c)`}>
        <rect x="20" y="24" width="60" height="72" fill={`url(#${id}holes)`} />
        <path d="M38 22l-3 74" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
      </g>
      <ellipse cx="50" cy="20" rx="27.5" ry="5.6" fill={`url(#${id}rim)`} stroke="#9aa1ae" strokeWidth=".8" />
      <ellipse cx="50" cy="20.6" rx="23.5" ry="3.6" fill="#6c7380" fillOpacity=".45" />
    </svg>
  );
}

/** The logo's four tiles, small, for the corner of the menu bar. */
export function LogoMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="0" y="0" width="7" height="7" rx="2" fill="currentColor" />
      <rect x="9" y="0" width="7" height="7" rx="2" fill="currentColor" opacity=".8" />
      <rect x="0" y="9" width="7" height="7" rx="2" fill="currentColor" opacity=".8" />
      <rect x="9" y="9" width="7" height="7" rx="2" fill="currentColor" opacity=".6" />
    </svg>
  );
}

/** Small toolbar symbols. */
export function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="9" height="14" viewBox="0 0 9 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M7 1.5L1.8 7 7 12.5" : "M2 1.5L7.2 7 2 12.5"} />
    </svg>
  );
}

export function Magnifier({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="6.8" cy="6.8" r="4.8" />
      <path d="M10.4 10.4L14 14" />
    </svg>
  );
}
