/**
 * The browse feed: everything on The Solo Market in one stream. Paid tools,
 * free tools, Grok Bots and blog posts become one card shape so a single grid,
 * search and guide can hold them all.
 *
 * Pure: no Firebase here, so the client feed can import it. The server half
 * that reads listings and free tools is lib/feed.server.ts.
 */
import { GROK_BOTS, grokBotGroupLabel, type GrokBot } from "./grokBots";
import extras from "./data/feedExtras.json";

export type FeedKind =
  | "tool"
  | "free"
  | "swap"
  | "kit"
  | "plugin"
  | "bot"
  | "agent"
  | "video"
  | "article"
  | "read"
  | "launch"
  | "perk"
  | "standings";

/**
 * Every kind, in the order the menu lists them, grouped into the menu's
 * sections. A kind with no section (the one AI Standings card) shows in
 * Everything only.
 */
export const FEED_KINDS: { id: FeedKind; label: string; one: string; section?: string }[] = [
  { id: "tool", label: "Marketplace", one: "Tool", section: "Buy once, own it" },
  { id: "free", label: "Free tools", one: "Free tool", section: "Free" },
  { id: "swap", label: "Swap a subscription", one: "Swap", section: "Free" },
  { id: "kit", label: "Templates and kits", one: "Template", section: "Free" },
  { id: "plugin", label: "Plugins and extensions", one: "Plugin", section: "Free" },
  { id: "bot", label: "Grok Bots", one: "Grok Bot", section: "AI" },
  { id: "agent", label: "AI agents", one: "AI agent", section: "AI" },
  { id: "video", label: "Video prompts", one: "Video prompt", section: "AI" },
  { id: "article", label: "Blog", one: "Blog", section: "Read" },
  { id: "read", label: "Reading", one: "Reading", section: "Read" },
  { id: "launch", label: "Just launched", one: "Launch", section: "Read" },
  { id: "perk", label: "Perks and credits", one: "Perk", section: "Perks" },
  { id: "standings", label: "AI Standings", one: "Live poll" },
];

/**
 * Each filter's own page. The feed is the same everywhere; the address says
 * which filter it opens on, so a filter can be linked, shared and indexed.
 * /free and /blog keep the addresses they always had.
 */
export const KIND_PATHS: Record<"all" | FeedKind, string> = {
  all: "/",
  tool: "/marketplace",
  free: "/free",
  swap: "/swaps",
  kit: "/templates",
  plugin: "/plugins",
  bot: "/grok-bots",
  agent: "/agents",
  video: "/video-prompts",
  article: "/blog",
  read: "/reading",
  launch: "/launches",
  perk: "/perks",
  standings: "/",
};

export function kindLabel(kind: FeedKind): string {
  return FEED_KINDS.find((k) => k.id === kind)?.one ?? kind;
}

export interface FeedItem {
  /** Unique across kinds: "tool:abc", "bot:xyz". */
  id: string;
  kind: FeedKind;
  title: string;
  summary: string;
  href: string;
  /** Opens on another site (x.ai, a free tool's own page). */
  external: boolean;
  /** Cover picture, when the item has one (tool screenshots, stored previews). */
  image?: string;
  /** "contain" for a square icon shown whole on the card's colour. */
  imageFit?: "cover" | "contain";
  /** A short muted clip that plays while the card is on screen. */
  video?: string;
  /** Top-left chip on the picture: a price, "Free", a platform, "Official". */
  badge?: string;
  /** Who made it. */
  byline?: string;
  bylineHref?: string;
  /** The grey line under the card: kind and category. */
  meta: string;
  /** The group a search can match on: a category, a bot group, a blog tag. */
  group: string;
  /** Grok Bot group id, for the bot sub-filter. */
  botGroup?: string;
  /** Agent platform: claude-skill, mcp, chatgpt-app. */
  platform?: string;
  /** The link the card's Copy button copies (Grok Bots only). */
  copyUrl?: string;
  /** Blog posts: their number, oldest first, shown on the cover. */
  issue?: number;
}

export function botToItem(b: GrokBot): FeedItem {
  const group = grokBotGroupLabel(b.group);
  return {
    id: `bot:${b.id}`,
    kind: "bot",
    title: b.name,
    summary: b.summary,
    href: b.url,
    external: true,
    badge: b.official ? "Official" : undefined,
    byline: b.author || undefined,
    bylineHref: b.handle ? `https://x.com/${b.handle}` : undefined,
    meta: `Grok Bot · ${group}`,
    group,
    botGroup: b.group,
    copyUrl: b.url,
  };
}

export const BOT_ITEMS: FeedItem[] = GROK_BOTS.map(botToItem);

/**
 * The hand-picked cards beyond tools, free tools, bots and our own blog:
 * agents, reading, swaps, perks, launches, kits, plugins, video prompts and
 * AI Standings. Picked and checked with treg on 15 November 2026; every link
 * opened live, every thumbnail stored under public/feed or public/video-prompts.
 */
export const EXTRA_ITEMS: FeedItem[] = (extras.items as Omit<FeedItem, "external">[]).map((it) => ({
  ...it,
  external: true,
}));

/**
 * The order kinds take turns in at the top of "Everything", so the first
 * screen shows the whole marketplace: a tool, something to read, a bot, a
 * video, our blog, a swap, an agent, a launch and so on. Bots come round
 * twice a turn because there are so many; once the others run out, the bots
 * carry on alone.
 */
const TURNS: FeedKind[] = [
  "tool", "read", "bot", "video", "article", "swap", "agent", "launch",
  "free", "perk", "bot", "kit", "plugin", "standings",
];

export function mixFeed(items: FeedItem[]): FeedItem[] {
  const queues = new Map<FeedKind, FeedItem[]>();
  for (const it of items) queues.set(it.kind, [...(queues.get(it.kind) ?? []), it]);
  const out: FeedItem[] = [];
  while ([...queues.values()].some((q) => q.length)) {
    for (const k of TURNS) {
      const q = queues.get(k);
      if (q?.length) out.push(q.shift()!);
    }
    // Any kind not in TURNS still gets its place.
    for (const [k, q] of queues) if (!TURNS.includes(k) && q.length) out.push(q.shift()!);
  }
  return out;
}

/**
 * Words people type that the cards say differently. Each query word also
 * matches its listed alternatives, so "email" finds the inbox bots and "money"
 * finds the budget ones. Kept small on purpose: a word belongs here only when
 * a real search for it came back thin.
 */
const SYNONYMS: Record<string, string[]> = {
  email: ["inbox", "mail", "gmail"],
  mail: ["inbox", "email", "gmail"],
  money: ["budget", "spending", "finance", "savings", "bills"],
  budget: ["spending", "money", "savings"],
  job: ["jobs", "career", "resume", "applications"],
  jobs: ["job", "career", "resume"],
  food: ["meal", "meals", "recipe", "recipes", "grocery", "chef"],
  cook: ["meal", "recipe", "chef", "cooking"],
  leads: ["prospects", "prospecting", "outbound", "sales"],
  customers: ["customer", "support", "tickets"],
  gym: ["fitness", "workout", "training"],
  workout: ["fitness", "gym", "training"],
  trip: ["travel", "flights", "itinerary"],
  holiday: ["travel", "trip", "flights"],
  code: ["coding", "engineering", "github", "bug", "developer"],
  bug: ["bugs", "qa", "engineering", "coding", "repro"],
  competitor: ["competitors", "competitive", "rival", "market"],
  privacy: ["private", "broker", "brokers", "removals", "scrub", "data"],
  twitter: ["x", "posts", "tweets"],
  study: ["learning", "exam", "tutor", "students"],
  hire: ["hiring", "recruiting", "candidates"],
  news: ["briefing", "digest", "research"],
  shopping: ["shop", "deals", "prices", "buy"],
  kids: ["family", "children", "homework"],
  files: ["file", "converter", "converters", "pdf"],
  convert: ["converter", "converters", "files"],
  write: ["writing", "writer", "notes", "newsletter"],
  sell: ["selling", "seller", "pricing", "launch"],
  ai: ["agent", "agents", "bot", "bots", "grok"],
};

/** Lowercase words of at least two letters, so "a" and "&" never match everything. */
function words(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9$]+/).filter((w) => w.length >= 2);
}

/**
 * Search the feed. Every query word has to match (or one of its synonyms
 * has to), as a word prefix, somewhere on the card. A hit in the title counts
 * most, then the group or kind, then the summary, then the maker, so "chef"
 * puts the chef bots above a bot that merely mentions one.
 */
export function searchFeed(items: FeedItem[], query: string): FeedItem[] {
  const q = words(query);
  if (q.length === 0) return items;
  const scored: { item: FeedItem; score: number }[] = [];
  for (const item of items) {
    const title = words(item.title);
    const group = words(`${item.group} ${kindLabel(item.kind)} ${item.meta} ${item.badge ?? ""}`);
    const summary = words(item.summary);
    const by = words(item.byline ?? "");
    let score = 0;
    let all = true;
    for (const w of q) {
      const forms = [w, ...(SYNONYMS[w] ?? [])];
      const hit = (list: string[]) => list.some((x) => forms.some((f) => x.startsWith(f)));
      const s = hit(title) ? 6 : hit(group) ? 3 : hit(summary) ? 2 : hit(by) ? 1 : 0;
      if (s === 0) {
        all = false;
        break;
      }
      score += s;
    }
    if (all) scored.push({ item, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
}
