/**
 * The homepage desktop's furniture: which aisles exist, which stage of a
 * founder's year each one belongs to, and where each one lives as a real page.
 *
 * Pure data, no components, so the server page and the client desktop read
 * the same list and the links a crawler sees are the ones a visitor clicks.
 */

import { SITE_FOLDERS } from "./usefulSites";
import { VIDEO_GROUPS } from "./videoGroups";

/** The symbol each aisle carries. Drawn in components/desktop/icons.tsx. */
export type AisleGlyph = "globe" | "wrench" | "layout" | "puzzle" | "box" | "bulb" | "film" | "photo" | "gift" | "chart" | "case";

export type AisleId =
  | "sites"
  | "tools"
  | "templates"
  | "plugins"
  | "free"
  | "idea"
  | "video"
  | "images"
  | "perks"
  | "reports"
  | "hire";

export type Aisle = {
  id: AisleId;
  label: string;
  /** The real page behind the folder, for crawlers and for opening in full. */
  href: string;
  /** The symbol pressed into its folder and shown in the sidebar. */
  glyph: AisleGlyph;
  /** Stocked aisles show items; the rest show an honest "opening soon" folder. */
  open: boolean;
  /**
   * Subfolders. An aisle with these opens on its pinned items and a folder for
   * each, rather than on one long shelf.
   */
  subs?: { id: string; label: string }[];
};

export type Stage = { label: string; aisles: Aisle[] };

export const STAGES: Stage[] = [
  {
    label: "Resources",
    aisles: [{ id: "sites", label: "Useful websites", href: "/marketplace", glyph: "globe", open: true, subs: SITE_FOLDERS }],
  },
  {
    label: "Idea",
    aisles: [{ id: "idea", label: "Idea check", href: "/marketplace", glyph: "bulb", open: false }],
  },
  {
    label: "Build",
    aisles: [
      { id: "tools", label: "Tools", href: "/marketplace", glyph: "wrench", open: true },
      { id: "templates", label: "Templates & kits", href: "/marketplace", glyph: "layout", open: false },
      { id: "plugins", label: "Plugins", href: "/marketplace", glyph: "puzzle", open: false },
      { id: "free", label: "Free & open source", href: "/free", glyph: "box", open: true },
    ],
  },
  {
    label: "Launch",
    aisles: [
      {
        id: "video",
        label: "Video prompts",
        href: "/video-prompts",
        glyph: "film",
        open: true,
        subs: VIDEO_GROUPS.map((g) => ({ id: g.id, label: g.label })),
      },
      { id: "images", label: "Launch images", href: "/marketplace", glyph: "photo", open: false },
      { id: "perks", label: "Perks & credits", href: "/marketplace", glyph: "gift", open: false },
    ],
  },
  {
    label: "Grow",
    aisles: [{ id: "reports", label: "Founder reports", href: "/marketplace", glyph: "chart", open: false }],
  },
  {
    label: "Hire",
    aisles: [{ id: "hire", label: "Fixed-price builds", href: "/marketplace", glyph: "case", open: false }],
  },
];

export const AISLES: Aisle[] = STAGES.flatMap((s) => s.aisles);

export function aisleById(id: AisleId): Aisle {
  return AISLES.find((a) => a.id === id) ?? AISLES[1];
}

/** One thing on a shelf, whatever aisle it came from. */
export type ShelfItem = {
  id: string;
  aisle: AisleId;
  title: string;
  /** Short line under the title in Quick Look. */
  blurb: string;
  /** "$29 once", or "Free". */
  price: string;
  image?: string;
  /** Where it lives. Internal paths open in a desktop window, https ones in a new tab. */
  href: string;
  /** "Runs on macOS", "Links out", tags: one line of facts. */
  facts: string;
  by?: string;
  /** When it arrived on this shelf, for the Notification Centre. */
  at?: number;
  /** Which subfolder of its aisle it sits in. */
  sub?: string;
  /** Shown at the top of its aisle, above the subfolders. */
  pinned?: boolean;
  /** `image` is a small site icon, not a picture: draw it whole, not cropped. */
  iconOnly?: boolean;
};

/** One line in the Notification Centre: something that happened in the market. */
export type MarketUpdate = {
  id: string;
  title: string;
  body: string;
  at: number;
  /** Internal path, or https for things that live elsewhere. */
  href?: string;
  kind: "listing" | "free" | "video" | "blog";
};

export type Wallpaper = "landing" | "quotes" | "keepgoing" | "night" | "aurora" | "sunrise" | "horizon";

/**
 * The four photographs are NASA's, taken from the International Space
 * Station, and free to use: NASA imagery is not under copyright in the US.
 * Its one condition is that nothing implies NASA endorses the site, so the
 * credit says who took the picture and nothing more.
 */
export const WALLPAPERS: { id: Wallpaper; label: string; thumb?: string; credit?: string }[] = [
  { id: "landing", label: "Landing page" },
  { id: "quotes", label: "Daily note" },
  { id: "keepgoing", label: "Keep going" },
  { id: "night", label: "City lights", thumb: "/wallpapers/night-thumb.jpg", credit: "NASA / Jessica Meir" },
  { id: "aurora", label: "Aurora", thumb: "/wallpapers/aurora-thumb.jpg", credit: "NASA, Expedition 47" },
  { id: "sunrise", label: "Sunrise", thumb: "/wallpapers/sunrise-thumb.jpg", credit: "NASA, Expedition 71" },
  { id: "horizon", label: "Horizon", thumb: "/wallpapers/horizon-thumb.jpg", credit: "NASA, Expedition 61" },
];

/** Wallpapers light enough that the menu bar, folders and footer go dark. */
export const LIGHT_WALLPAPERS: Wallpaper[] = ["landing", "quotes"];

/** What a first visit sees: the day's note. */
export const DEFAULT_WALLPAPER: Wallpaper = "quotes";

/** Stored names from before the wallpapers were renamed. */
export const OLD_WALLPAPERS: Record<string, Wallpaper> = { paper: "quotes", graphite: "keepgoing", dusk: "landing" };

/**
 * The Daily note wallpaper: one line a day, cycling through ten.
 *
 * Placeholders until Sevval picks her ten. Written for this site rather than
 * borrowed, so nothing here needs anyone's permission or attribution.
 */
export const DAILY_NOTES: string[] = [
  "ship it before it feels ready.",
  "one customer who loves it beats a thousand who like it.",
  "small is a strategy, not a stage.",
  "you are allowed to build something that just works.",
  "talk to the people who would pay.",
  "build the tool you keep wishing existed.",
  "charge for it. money is feedback.",
  "a tiny tool that solves a real problem is a real business.",
  "launch, listen, repeat.",
  "you only need to be useful to someone.",
];

/**
 * The Landing page wallpaper's words, Sevval's own. The word after "solo"
 * turns through these, so every kind of solo builder sees themselves named.
 */
export const WELCOME = {
  hello: "hi! welcome to thesolomarket!",
  lead: "here you can find everything you need as a solo",
  roles: ["founder", "builder", "vibecoder", "maker", "indie hacker", "developer", "designer", "creator"],
  aside: "we add new finds every thursday. no ai slop, all picked by founders.",
};

/**
 * Today's line, by day of the year, so everyone sees the same one on the same
 * day. `shift` is the visitor's own shuffle: each press of Shuffle moves it, and
 * it stays put across visits, so the next day still moves on from there.
 */
export function noteFor(date: Date, shift = 0): string {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  const n = DAILY_NOTES.length;
  return DAILY_NOTES[(((day + shift) % n) + n) % n];
}

/** The versions Keep going shuffles between. */
export const KEEP_VARIANTS = ["words", "founders"] as const;
export function keepVariant(shift: number): (typeof KEEP_VARIANTS)[number] {
  return KEEP_VARIANTS[((shift % KEEP_VARIANTS.length) + KEEP_VARIANTS.length) % KEEP_VARIANTS.length];
}

/** A shift that lands on a different note from the one showing now. */
export function nextShift(shift: number): number {
  return shift + 1 + Math.floor(Math.random() * (DAILY_NOTES.length - 1));
}
