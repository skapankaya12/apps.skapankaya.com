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
 * shading and a shadow underneath. Every tile below has all three, and every
 * object is drawn front on, at one size, under the same light.
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
 * The colours of a Mac: the system blue, green, yellow, orange, red, pink,
 * indigo, purple and teal, plus paper, silver, graphite, kraft and wood for
 * the objects. Each is a gradient, light at the top and deeper below, so
 * every object is lit the same way whatever its colour.
 */
const PALETTE = {
  B: ["#5aaeff", "#0a6cf5"], // blue
  G: ["#62d881", "#28a745"], // green
  Y: ["#ffdf5c", "#f7b500"], // yellow
  O: ["#ffb347", "#ff8a00"], // orange
  R: ["#ff6f66", "#e5302a"], // red
  H: ["#ff7d97", "#ff2d55"], // pink, the heart
  N: ["#6f8cff", "#4b5df0"], // indigo
  V: ["#b98aff", "#7e4be0"], // purple
  T: ["#6fe3f2", "#16b2cf"], // teal
  P: ["#ffffff", "#f0f2f5"], // paper
  S: ["#eceef3", "#c3c8d2"], // silver
  I: ["#4b505b", "#1e2127"], // graphite
  K: ["#e6bd82", "#b9874a"], // kraft
  W: ["#c99a68", "#8f6438"], // wood
} as const;
type Tone = keyof typeof PALETTE;

/** A fill from the palette, for use inside a tile. */
const tone = (id: string, t: Tone) => `url(#${id}${t})`;

/** The faint edge every paper object gets, so it lifts off a pale tile. */
const EDGE = { stroke: "#1e2127", strokeOpacity: 0.14, strokeWidth: 0.9 };

/** Each app's tile, top colour then bottom, the way its Mac counterpart is coloured. */
const TILES: Record<Glyph, [string, string]> = {
  market: ["#ffffff", "#e4e8f1"],
  about: ["#ffffff", "#e4e8f1"],
  launchpad: ["#4b505e", "#1d2028"],
  pages: ["#ffffff", "#e6ebf3"],
  free: ["#7fe08f", "#26a148"],
  video: ["#ffa36b", "#ee4d29"],
  notes: ["#ffffff", "#f1f1ef"],
  blog: ["#5b6ea8", "#25335f"],
  library: ["#f6f1ea", "#e0d6c6"],
  saved: ["#ffffff", "#eceff4"],
  sell: ["#5ee3cb", "#0e8f84"],
  today: ["#ffffff", "#eef0f4"],
  goals: ["#ffffff", "#eef0f4"],
  focus: ["#3a3f4b", "#16181e"],
  review: ["#ffffff", "#f0f1f4"],
  idea: ["#fff8e8", "#f2e4c2"],
};

/**
 * The tile every app icon sits on. `id` comes from useId so two copies of the
 * same icon (the Dock and a menu, say) never share gradient ids: a gradient
 * referenced from a hidden copy draws nothing in some browsers.
 */
function Tile({ bg, children, size, label }: { bg: [string, string]; children: (id: string) => ReactNode; size: number; label?: string }) {
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
          <stop offset="0" stopColor={bg[0]} />
          <stop offset="1" stopColor={bg[1]} />
        </linearGradient>
        {(Object.keys(PALETTE) as Tone[]).map((t) => (
          <linearGradient key={t} id={`${id}${t}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PALETTE[t][0]} />
            <stop offset="1" stopColor={PALETTE[t][1]} />
          </linearGradient>
        ))}
        <radialGradient id={`${id}top`} cx="50%" cy="0%" r="75%" fx="50%" fy="0%">
          <stop offset="0" stopColor="#fff" stopOpacity=".6" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}low`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".72" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".14" />
        </linearGradient>
        <linearGradient id={`${id}rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset=".4" stopColor="#fff" stopOpacity=".2" />
          <stop offset="1" stopColor="#fff" stopOpacity=".1" />
        </linearGradient>
        {/* The sheen across the top of a coloured object. */}
        <linearGradient id={`${id}shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".42" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}clip`}>
          <path d={SQUIRCLE} />
        </clipPath>
        <filter id={`${id}drop`} x="-25%" y="-20%" width="150%" height="160%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodColor="#000" floodOpacity=".22" />
          <feDropShadow dx="0" dy="4" stdDeviation="3.6" floodColor="#000" floodOpacity=".2" />
        </filter>
        {/* The shadow an object casts on its tile: the same light for every icon. */}
        <filter id={`${id}obj`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="2.2" floodColor="#000" floodOpacity=".26" />
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
  | "about"
  | "today"
  | "goals"
  | "focus"
  | "review"
  | "idea";

/** A small rounded square in one tone, with the shared sheen. */
function Chip({ x, y, s, t, id }: { x: number; y: number; s: number; t: Tone; id: string }) {
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} rx={s * 0.28} fill={tone(id, t)} />
      <rect x={x} y={y} width={s} height={s} rx={s * 0.28} fill={`url(#${id}shine)`} />
    </g>
  );
}

/** A sheet of paper with a coloured band across its top, for notes and the week. */
function BandedSheet({ id, band, x = 25, y = 22, w = 50, h = 56 }: { id: string; band: Tone; x?: number; y?: number; w?: number; h?: number }) {
  const r = 7;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={tone(id, "P")} {...EDGE} />
      <path d={`M${x} ${y + r}a${r} ${r} 0 0 1 ${r}-${r}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v8h-${w}z`} fill={tone(id, band)} />
      <path d={`M${x} ${y + r}a${r} ${r} 0 0 1 ${r}-${r}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v8h-${w}z`} fill={`url(#${id}shine)`} />
    </>
  );
}

export function AppIcon({ g, size = 48, label }: { g: Glyph; size?: number; label?: string }) {
  return (
    <Tile bg={TILES[g]} size={size} label={label}>
      {(id) => <g filter={`url(#${id}obj)`}>{draw(g, id)}</g>}
    </Tile>
  );
}

/** Each object, front on, inside the same 26 to 74 box. */
function draw(g: Glyph, id: string): ReactNode {
  switch (g) {
    case "market":
    case "about":
      // Our own four tiles, the logo as an app.
      return (
        <>
          <Chip id={id} x={26} y={26} s={22} t="B" />
          <Chip id={id} x={52} y={26} s={22} t="N" />
          <Chip id={id} x={26} y={52} s={22} t="N" />
          <Chip id={id} x={52} y={52} s={22} t="V" />
        </>
      );

    case "launchpad": {
      const t: Tone[] = ["R", "Y", "G", "T", "N", "H", "O", "G", "B"];
      return t.map((c, i) => <Chip key={i} id={id} x={25.5 + (i % 3) * 17.5} y={25.5 + Math.floor(i / 3) * 17.5} s={13} t={c} />);
    }

    case "pages":
      // A blue globe.
      return (
        <>
          <defs>
            <clipPath id={`${id}globe`}>
              <circle cx="50" cy="50" r="25" />
            </clipPath>
          </defs>
          <circle cx="50" cy="50" r="25" fill={tone(id, "B")} />
          <g clipPath={`url(#${id}globe)`} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.8">
            <ellipse cx="50" cy="50" rx="11" ry="25" />
            <path d="M50 25v50M25 50h50" />
            <path d="M28 37c14 5 30 5 44 0M28 63c14-5 30-5 44 0" />
          </g>
          <circle cx="50" cy="50" r="25" fill={`url(#${id}shine)`} />
        </>
      );

    case "free":
      // An open kraft box, flaps out: free things, given away.
      return (
        <>
          <path d="M28 46h44v26a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4z" fill={tone(id, "K")} />
          <path d="M28 46h44v26a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4z" fill={`url(#${id}shine)`} />
          <rect x="28" y="44" width="44" height="5" rx="1.5" fill="#6b4a22" />
          <path d="M28 44l-8-10h22l8 10z" fill="#f2d7a8" />
          <path d="M72 44l8-10H58l-8 10z" fill="#e6c08a" />
          <rect x="45" y="49" width="10" height="27" fill="#f2e2c2" fillOpacity=".75" />
        </>
      );

    case "video":
      // A clapperboard: graphite slate, striped clapper, a play mark.
      return (
        <>
          <defs>
            <pattern id={`${id}stripe`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
              <rect width="5" height="10" fill="#fff" />
              <rect x="5" width="5" height="10" fill="#1c1c22" />
            </pattern>
          </defs>
          <rect x="24" y="42" width="52" height="34" rx="5" fill={tone(id, "I")} />
          <g transform="rotate(-9 24 38)">
            <rect x="24" y="29" width="52" height="10" rx="2.5" fill={`url(#${id}stripe)`} />
          </g>
          <rect x="24" y="41" width="52" height="7" fill={`url(#${id}stripe)`} />
          <path d="M45 54l13 8-13 8z" fill="#fff" />
        </>
      );

    case "notes":
      // A notepad with a yellow top.
      return (
        <>
          <BandedSheet id={id} band="Y" />
          <path d="M33 46h34M33 55h34M33 64h22" stroke="#cfd2d8" strokeWidth="2.6" strokeLinecap="round" />
        </>
      );

    case "blog":
      // A written sheet with a pencil across it.
      return (
        <>
          <rect x="27" y="22" width="40" height="54" rx="5" fill={tone(id, "P")} {...EDGE} />
          <path d="M34 34h26M34 42h26M34 50h16" stroke="#c4c8d4" strokeWidth="2.6" strokeLinecap="round" />
          <g transform="rotate(-38 58 62)">
            <rect x="38" y="57.5" width="32" height="9" fill={tone(id, "Y")} />
            <rect x="38" y="57.5" width="32" height="9" fill={`url(#${id}shine)`} />
            <rect x="70" y="57.5" width="4" height="9" fill={tone(id, "S")} />
            <rect x="74" y="57.5" width="5" height="9" rx="1.4" fill="#ef8aa0" />
            <path d="M38 57.5l-9 4.5 9 4.5z" fill="#f1d9b0" />
            <path d="M31.5 60.8L29 62l2.5 1.2z" fill="#333" />
          </g>
        </>
      );

    case "library":
      // Three books on a shelf: what you own stays here.
      return (
        <>
          {[
            { x: 26, y: 28, w: 13, h: 46, t: "V" as Tone, r: 0 },
            { x: 41, y: 33, w: 12, h: 41, t: "B" as Tone, r: 0 },
            { x: 57, y: 29, w: 13, h: 46, t: "R" as Tone, r: 14 },
          ].map((b) => (
            <g key={b.x} transform={b.r ? `rotate(${b.r} ${b.x} ${b.y + b.h})` : undefined}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill={tone(id, b.t)} />
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill={`url(#${id}shine)`} />
              <path d={`M${b.x} ${b.y + 8}h${b.w}M${b.x} ${b.y + b.h - 8}h${b.w}`} stroke="#ffd36b" strokeWidth="1.6" />
            </g>
          ))}
          <rect x="21" y="74" width="58" height="5" rx="2" fill={tone(id, "W")} />
        </>
      );

    case "saved":
      // A glossy pink heart.
      return (
        <>
          <path d="M50 76S24 61 24 42.5a13 13 0 0 1 26-5 13 13 0 0 1 26 5C76 61 50 76 50 76z" fill={tone(id, "H")} />
          <path d="M50 76S24 61 24 42.5a13 13 0 0 1 26-5 13 13 0 0 1 26 5C76 61 50 76 50 76z" fill={`url(#${id}shine)`} />
        </>
      );

    case "sell":
      // A paper price tag on its string.
      return (
        <>
          <path d="M31 26c-8 3-10 12-3 17" fill="none" stroke="#f7f1e3" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M33 30h20l22 22-21 21-22-22V30z" fill={tone(id, "P")} {...EDGE} strokeLinejoin="round" />
          <circle cx="40" cy="38" r="3.6" fill="#0e8f84" />
          <text x="55" y="61" textAnchor="middle" fontSize="17" fontWeight="800" fill="#0e8f84" fontFamily="-apple-system, system-ui, sans-serif" transform="rotate(45 55 56)">
            $
          </text>
        </>
      );

    case "today":
      // A checklist card: two done, one to go.
      return (
        <>
          <rect x="25" y="22" width="50" height="56" rx="7" fill={tone(id, "P")} {...EDGE} />
          {[36, 50, 64].map((y, i) => (
            <g key={y}>
              {i < 2 ? (
                <>
                  <rect x="32" y={y - 6} width="12" height="12" rx="3.5" fill={tone(id, "B")} />
                  <path d={`M35 ${y}l2.5 2.5 4-5`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </>
              ) : (
                <rect x="32.8" y={y - 5.2} width="10.4" height="10.4" rx="3" fill="#fff" stroke="#c9ced8" strokeWidth="1.6" />
              )}
              <rect x="49" y={y - 2.6} width={i === 2 ? 14 : 19} height="5.2" rx="2.6" fill={i < 2 ? "#d3d8e0" : "#9aa2ae"} />
            </g>
          ))}
        </>
      );

    case "goals":
      // A red target with an arrow in it.
      return (
        <>
          <circle cx="48" cy="54" r="24" fill={tone(id, "R")} />
          <circle cx="48" cy="54" r="17" fill={tone(id, "P")} />
          <circle cx="48" cy="54" r="10" fill={tone(id, "R")} />
          <circle cx="48" cy="54" r="4" fill="#fff" />
          <circle cx="48" cy="54" r="24" fill={`url(#${id}shine)`} />
          <path d="M49 53l20-20" stroke="#2b2f3a" strokeWidth="3" strokeLinecap="round" />
          <path d="M66 28l8-2-2 8-4 2-4-4z" fill={tone(id, "B")} />
        </>
      );

    case "focus":
      // A timer with an orange ring three quarters gone.
      return (
        <>
          <rect x="45" y="20" width="10" height="6" rx="2" fill={tone(id, "O")} />
          <circle cx="50" cy="53" r="25" fill={tone(id, "P")} {...EDGE} />
          <circle cx="50" cy="53" r="17" fill="none" stroke="#ffe6c7" strokeWidth="6" />
          <path d="M50 36a17 17 0 1 1-17 17" fill="none" stroke="#ff8a00" strokeWidth="6" strokeLinecap="round" />
          <path d="M50 53V43" stroke="#1e2127" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="50" cy="53" r="2.8" fill="#1e2127" />
        </>
      );

    case "review":
      // A week page: a red band, seven days, today marked.
      return (
        <>
          <BandedSheet id={id} band="R" y={24} h={52} />
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x={31 + (i % 4) * 10} y={45 + Math.floor(i / 4) * 11} width="7.5" height="7.5" rx="2" fill={i === 4 ? "#e5302a" : "#d4d8e0"} />
          ))}
          <rect x="35" y="19" width="3.4" height="10" rx="1.7" fill={tone(id, "I")} />
          <rect x="61.6" y="19" width="3.4" height="10" rx="1.7" fill={tone(id, "I")} />
        </>
      );

    case "idea":
      // A lit yellow bulb on a metal base.
      return (
        <>
          <path d="M50 22a18 18 0 0 0-10.5 32.6c2 1.6 3 3.6 3 6.4h15c0-2.8 1-4.8 3-6.4A18 18 0 0 0 50 22z" fill={tone(id, "Y")} />
          <path d="M50 22a18 18 0 0 0-10.5 32.6c2 1.6 3 3.6 3 6.4h15c0-2.8 1-4.8 3-6.4A18 18 0 0 0 50 22z" fill={`url(#${id}shine)`} />
          <path d="M45.5 44l4.5 6 4.5-6" fill="none" stroke="#c98a00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="42.5" y="63" width="15" height="5" rx="2" fill={tone(id, "S")} />
          <rect x="44.5" y="70" width="11" height="4.5" rx="2" fill={tone(id, "I")} />
        </>
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
    case "pencil":
      return <path d="M4 20l1.2-4.6L15.8 4.8a2.1 2.1 0 0 1 3 3L8.2 18.4zM14 6.6l3 3" />;
    case "check":
      return <path d="M4 5h16v14H4zM8 12l2.5 2.5L16 9" />;
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
