/* ---------------------------------------------------------------------------
   Avatar: a soft shape in one colour with two capsule eyes, picked from the
   bot's id so a bot always looks the same. Shared by the list and the guide.
--------------------------------------------------------------------------- */

const COLORS: [string, string][] = [
  ["#7b4ce6", "#b49cf5"],
  ["#5fb86a", "#a8dca0"],
  ["#d9488f", "#f0a3c8"],
  ["#4fa99a", "#9ad6c8"],
  ["#e0803a", "#f5c08e"],
  ["#3f7fdc", "#9cc0f2"],
  ["#8b1a1a", "#d27a7a"],
  ["#c9a227", "#ecd889"],
];

function polar(lobes: number, depth: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 360; i += 3) {
    const a = (i * Math.PI) / 180;
    const r = 40 + depth * Math.cos(lobes * a);
    pts.push(`${(50 + r * Math.sin(a)).toFixed(1)},${(52 - r * Math.cos(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

const SHAPES = [
  null, // circle
  polar(6, 5),
  polar(5, 7),
  polar(4, 4),
];

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The bot's two colours, darker first, the same pair its avatar uses. */
export function botColors(id: string): [string, string] {
  return COLORS[hash(id) % COLORS.length];
}

export type BotMotion = "still" | "blink" | "hop";

/**
 * The motion a bot has at rest. Most are still; about one in eight blinks
 * and one in twelve hops, picked from the id so the same bots always move.
 * The rest wake up only when their card is hovered (see .bot-card in
 * globals.css).
 */
export function botMotion(id: string): BotMotion {
  const n = (hash(id) >>> 7) % 24;
  if (n < 3) return "blink";
  if (n < 5) return "hop";
  return "still";
}

export function BotAvatar({
  id,
  className = "h-12 w-12 shrink-0 sm:h-16 sm:w-16",
  motion = "still",
}: {
  id: string;
  className?: string;
  motion?: BotMotion;
}) {
  const h = hash(id);
  const [top, bottom] = COLORS[h % COLORS.length];
  const shape = SHAPES[(h >>> 3) % SHAPES.length];
  const gid = `g${id.replace(/[^a-zA-Z0-9]/g, "")}`;
  // Each bot starts its loop at its own point, so two blinking bots side by
  // side never blink together.
  const delay = `-${((h >>> 11) % 4000) / 1000}s`;
  return (
    <svg
      viewBox="0 0 100 100"
      className={`bot ${motion !== "still" ? `bot-${motion}` : ""} ${className}`}
      style={{ "--bot-delay": delay } as React.CSSProperties}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <g className="bot-body">
        {shape ? <path d={shape} fill={`url(#${gid})`} /> : <circle cx="50" cy="52" r="42" fill={`url(#${gid})`} />}
        <g className="bot-eyes">
          <rect x="36" y="32" width="8" height="18" rx="4" fill="#fff" transform="rotate(14 40 41)" />
          <rect x="54" y="32" width="8" height="18" rx="4" fill="#fff" transform="rotate(14 58 41)" />
        </g>
      </g>
    </svg>
  );
}
