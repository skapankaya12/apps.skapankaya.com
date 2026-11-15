"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { brand } from "@/lib/brand";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getAuthResolved, logout } from "@/lib/store";
import { GROK_BOT_GROUPS } from "@/lib/grokBots";
import { BOT_ITEMS, FEED_KINDS, KIND_PATHS, mixFeed, searchFeed, type FeedItem, type FeedKind } from "@/lib/feed";
import { BotAvatar, botColors, botMotion, hash } from "./GrokBotAvatar";
import { FeedGuide, GuideIcon, SearchIcon } from "./FeedGuide";
import { FeedHero } from "./FeedHero";
import { NewsletterBar } from "./NewsletterBand";
import { SuggestTool } from "./SuggestTool";
import { TopicIcon, topicFor } from "./TopicIcon";
import { ArticleArt, hasArticleArt } from "./ArticleArt";

/** How many cards render at once, and how many each scroll step adds. */
const STEP = 24;

/**
 * Cards per page. Scrolling loads a page in steps; at the end of a page the
 * scrolling stops, the page counter and the site footer come into view, and
 * the next hundred is a click away. Endless scroll all the way down would
 * push the footer, the page's only other navigation, out of reach.
 */
const PER_PAGE = 100;

/** The guide opens by itself this long after the page loads, once per visit. */
const GUIDE_DELAY_MS = 5000;
const GUIDE_SEEN_KEY = "feed-guide-seen";

type KindFilter = "all" | FeedKind;

/** Picture shapes, as height over width, so the columns fall unevenly. */
const BOT_RATIOS = [0.62, 0.75, 0.56, 0.86, 0.68];

function ratioOf(it: FeedItem): number {
  switch (it.kind) {
    case "article":
      return 0.62; // a quiet cover: the logo's tiles, the topic and the number
    case "tool":
      return 0.66;
    case "video":
      return 0.5625; // 16:9, the films' own shape
    case "read":
    case "standings":
      return 0.6;
    case "agent":
      return 0.72;
    case "plugin":
      return it.imageFit === "contain" ? 0.62 : 0.54;
    case "free":
    case "swap":
    case "perk":
    case "launch":
    case "kit":
      return 0.54; // social cards and screenshots, about 1.9:1
    default:
      return BOT_RATIOS[(hash(it.id.slice(4)) >>> 5) % BOT_RATIOS.length];
  }
}

/** Columns for a grid this wide. */
function columnsFor(width: number): number {
  if (width < 600) return 1;
  if (width < 960) return 2;
  if (width < 1360) return 3;
  if (width < 1800) return 4;
  return 5;
}

/**
 * Deal cards into columns, each to whichever column is shortest so far, by a
 * rough height: the picture plus a line allowance for the text. Greedy and
 * append-only, so loading more adds cards to the bottoms of the columns and
 * never moves one already on screen, which CSS columns would.
 */
function deal(items: FeedItem[], cols: number, firstColumnStart = 0): FeedItem[][] {
  const out: FeedItem[][] = Array.from({ length: cols }, () => []);
  const h = new Array(cols).fill(0);
  h[0] = firstColumnStart; // room already taken by a lead card
  for (const it of items) {
    let i = 0;
    for (let c = 1; c < cols; c++) if (h[c] < h[i] - 0.01) i = c;
    out[i].push(it);
    h[i] += ratioOf(it) + 0.42 + Math.min(it.summary.length, 140) / 600;
  }
  return out;
}

/**
 * The marketplace as one stream: tools, free tools, Grok Bots and blog posts
 * in a single grid, and the page's own navigation. There is no site header
 * here. The logo goes home, the menu in the middle both filters the feed and
 * lists the rest of the site, and the guide on the right helps you pick.
 *
 * `/browse` opens it on everything, `/grok-bots` on the bots.
 */
export function MarketFeed({
  items,
  initialKind = "all",
  intro,
  note,
  hero,
  lead,
  after,
}: {
  /** Everything except the Grok Bots, read on the server. */
  items: FeedItem[];
  initialKind?: KindFilter;
  /** The guide's one-line introduction for this page. */
  intro: string;
  /** A line under the bar, for page-specific copy such as the launch status. */
  note?: ReactNode;
  /** The page's own opening, between the bar and the grid (the homepage pitch). */
  hero?: ReactNode;
  /** A card of the page's own, first in the first column of the opening view. */
  lead?: ReactNode;
  /** Shown under the page counter, at the end of every page. */
  after?: ReactNode;
}) {
  const router = useRouter();
  // The filter is the page: each one has its own address (KIND_PATHS), so
  // switching filters navigates and this state only ever changes in place for
  // the guide's "show all" on Everything.
  const [kind, setKind] = useState<KindFilter>(initialKind);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [botGroup, setBotGroup] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(STEP);
  const [page, setPage] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cols, setCols] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const typed = useRef(false);

  // The first bot on the page is one that moves, so the opening screen has a
  // little life in it; the rest keep their order (most of them still).
  const everything = useMemo(() => {
    const bots = [...BOT_ITEMS];
    const i = bots.findIndex((b) => botMotion(b.id.slice(4)) !== "still");
    if (i > 0) bots.unshift(...bots.splice(i, 1));
    return mixFeed([...items, ...bots]);
  }, [items]);

  // Column count follows the grid's own width, measured straight away (the
  // observer's first report waits for a rendered frame, which a background
  // tab may never get) and again on every resize.
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el) return;
    setCols(columnsFor(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setCols(columnsFor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Open the guide five seconds in, unless this visit has already seen it or
  // the visitor is already searching on their own. sessionStorage can throw
  // (private mode, blocked storage); then it simply opens every visit.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(GUIDE_SEEN_KEY) === "1";
    } catch {}
    if (seen) return;
    const t = setTimeout(() => {
      if (!typed.current) setGuideOpen(true);
    }, GUIDE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // "/" jumps to the search box, the way most directories do it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || guideOpen) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      searchBox.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guideOpen]);

  // The menu closes on a click anywhere else and on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    try {
      sessionStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch {}
  }, []);

  const applyQueryParam = useCallback((q: string) => {
    typed.current = true;
    setQuery(q);
  }, []);

  const searching = query.trim().length > 0;
  const matches = useMemo(() => searchFeed(everything, query), [everything, query]);

  // Counts follow the search, so every entry in the menu says how many of the
  // matches it holds rather than how many it has overall.
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of matches) {
      c[it.kind] = (c[it.kind] ?? 0) + 1;
      if (it.botGroup) c[`bot:${it.botGroup}`] = (c[`bot:${it.botGroup}`] ?? 0) + 1;
    }
    return c;
  }, [matches]);

  const filtered = useMemo(
    () =>
      matches.filter(
        (it) =>
          (kind === "all" || it.kind === kind) &&
          (kind !== "bot" || botGroup === "all" || it.botGroup === botGroup),
      ),
    [matches, kind, botGroup],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = useMemo(() => filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE), [filtered, page]);
  const pageDone = shown >= pageItems.length;
  const showLead = Boolean(lead) && !searching && page === 0;
  const columns = useMemo(
    () => deal(pageItems.slice(0, shown), Math.max(cols, 1), showLead ? 1.2 : 0),
    [pageItems, shown, cols, showLead],
  );

  // Endless scroll within the page: a sentinel under the grid asks for more
  // as it comes within a screen of view, up to the end of the page.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || shown >= pageItems.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown((n) => Math.min(n + STEP, pageItems.length));
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, pageItems.length]);

  function restart() {
    setPage(0);
    setShown(STEP);
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
  }

  /** Go to a filter's own page, carrying the search along. */
  function pickKind(k: KindFilter) {
    if (k === kind) {
      setBotGroup("all");
      if (k !== "bot") setMenuOpen(false);
      restart();
      return;
    }
    setMenuOpen(false);
    const q = query.trim();
    router.push(`${KIND_PATHS[k]}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  }

  function pickBotGroup(g: string) {
    if (kind !== "bot") return pickKind("bot");
    setBotGroup(g);
    setMenuOpen(false);
    restart();
  }

  function search(q: string) {
    typed.current = true;
    setQuery(q);
    setPage(0);
    setShown(STEP);
  }

  function goTo(p: number) {
    setPage(p);
    setShown(STEP);
    window.scrollTo({ top: 0 });
  }

  // From the guide: search the page for what was typed and, when one card was
  // picked, bring it into view and flash it so the eye lands on it.
  function applyFromGuide(q: string, itemId?: string) {
    closeGuide();
    // The guide searches everything; from a filter's page, show the results
    // on Everything's.
    if (kind !== "all") {
      router.push(`/?q=${encodeURIComponent(q)}`);
      return;
    }
    typed.current = true;
    setQuery(q);
    setKind("all");
    setBotGroup("all");
    const index = itemId ? searchFeed(everything, q).findIndex((it) => it.id === itemId) : -1;
    setPage(index > 0 ? Math.floor(index / PER_PAGE) : 0);
    setShown(Math.max(STEP, index > 0 ? (index % PER_PAGE) + 1 : 0));
    setTimeout(() => {
      const card = itemId ? document.getElementById(cardId(itemId)) : null;
      if (card) {
        card.scrollIntoView({ block: "center", behavior: "smooth" });
        card.dataset.flash = "1";
        setTimeout(() => delete card.dataset.flash, 1600);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  }

  const label =
    kind === "all"
      ? "Everything"
      : kind === "bot" && botGroup !== "all"
        ? (GROK_BOT_GROUPS.find((g) => g.id === botGroup)?.label ?? "Grok Bots")
        : (FEED_KINDS.find((k) => k.id === kind)?.label ?? "Everything");

  return (
    <div className="w-full px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <Suspense fallback={null}>
        <QueryParamSync onQuery={applyQueryParam} />
      </Suspense>

      {/* The bar floats over the grid as it scrolls: the logo on the left, the
          menu and search in one pill in the middle, the guide on the right. */}
      <div className="sticky top-3 z-30 flex items-center gap-1.5 sm:gap-3">
        <Link
          href="/"
          aria-label={`${brand.name} home`}
          className="flex h-11 shrink-0 items-center rounded-full bg-[var(--background)] px-2.5 shadow-[0_2px_12px_rgba(16,16,20,0.10),0_0_0_1px_rgba(16,16,20,0.05)] sm:px-4"
        >
          <Image src="/logo.png" alt={brand.name} width={1160} height={620} priority className="h-7 w-auto sm:h-8" />
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <div
            ref={menu}
            className="relative flex h-12 w-full min-w-0 items-center rounded-full bg-[var(--background)] shadow-[0_2px_12px_rgba(16,16,20,0.10),0_0_0_1px_rgba(16,16,20,0.05)] sm:w-auto"
          >
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex h-full max-w-[60%] shrink-0 items-center gap-1.5 rounded-l-full pl-3.5 pr-2.5 text-[15px] font-medium sm:max-w-none sm:gap-2 sm:pl-5 sm:pr-4"
            >
              {/* "Everything" does not fit beside search on a phone. */}
              {kind === "all" ? (
                <>
                  <span className="sm:hidden">All</span>
                  <span className="hidden sm:inline">Everything</span>
                </>
              ) : (
                <span className="truncate">{label}</span>
              )}
              <Chevron open={menuOpen} />
            </button>
            <span className="h-6 w-px shrink-0 bg-[var(--border)]" aria-hidden />
            <label className="flex h-full min-w-0 flex-1 items-center gap-1.5 pl-2.5 pr-3 sm:gap-2 sm:pl-4 sm:pr-4">
              <SearchIcon />
              <span className="sr-only">Search {brand.name}</span>
              <input
                ref={searchBox}
                type="search"
                value={query}
                onChange={(e) => search(e.target.value)}
                onFocus={() => (typed.current = true)}
                placeholder="Search"
                autoComplete="off"
                className="w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-[var(--muted)] focus-visible:shadow-none! sm:w-48 [&::-webkit-search-cancel-button]:hidden"
              />
              {searching && (
                <button
                  type="button"
                  onClick={() => {
                    search("");
                    searchBox.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </label>

            {menuOpen && (
              <SiteMenu
                kind={kind}
                botGroup={botGroup}
                counts={counts}
                total={matches.length}
                searching={searching}
                onKind={pickKind}
                onBotGroup={pickBotGroup}
                onNavigate={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>

        {/* On Marketplace the corner asks for the tool that is missing instead:
            it opens the contact form set to "Request a tool". */}
        {kind === "tool" ? (
          <button
            type="button"
            onClick={() => setSuggestOpen(true)}
            aria-label="Suggest a tool"
            className="group/guide flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--background)] pl-1.5 pr-1.5 text-sm font-medium shadow-[0_2px_12px_rgba(16,16,20,0.10),0_0_0_1px_rgba(16,16,20,0.05)] hover:bg-[var(--surface-muted)] sm:pr-4"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#8b1a1a] to-[#c25555] text-white" aria-hidden>
              <TopicIcon name="wand" className="h-[18px] w-[18px]" />
            </span>
            <span className="hidden sm:inline">Suggest a tool</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            aria-label="Help me choose"
            className="group/guide flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--background)] pl-1.5 pr-1.5 text-sm font-medium shadow-[0_2px_12px_rgba(16,16,20,0.10),0_0_0_1px_rgba(16,16,20,0.05)] hover:bg-[var(--surface-muted)] sm:pr-4"
          >
            <GuideIcon bots={kind === "bot"} className="h-8 w-8" />
            <span className="hidden sm:inline">Help me choose</span>
          </button>
        )}
        <AccountButton path={KIND_PATHS[kind]} />
      </div>

      <FeedHero kind={kind} extra={hero} />
      {note && <div className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-[var(--muted)]">{note}</div>}

      <div ref={grid} id="apps" className={`mt-8 scroll-mt-24 ${cols ? "" : "opacity-0"}`}>
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-lg font-medium">
              Nothing matches {searching ? `"${query.trim()}"` : "here yet"}
              {searching && kind !== "all" ? ` in ${label}` : ""}.
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">Try one simple word, or let the guide help.</p>
            <div className="mt-5 flex justify-center gap-3">
              {kind !== "all" && (
                <button type="button" onClick={() => pickKind("all")} className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm">
                  Look in everything
                </button>
              )}
              <button type="button" onClick={() => setGuideOpen(true)} className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm text-[var(--background)]">
                Help me choose
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-6 lg:gap-7">
            {columns.map((col, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col gap-9">
                {i === 0 && showLead && <div key="lead">{lead}</div>}
                {col.map((it) => (
                  <FeedCard key={it.id} item={it} compact={kind === "all"} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={sentinel} aria-hidden className="h-px" />
      {filtered.length > 0 && !pageDone && (
        <p className="pt-12 text-center text-sm text-[var(--muted)]">Loading more</p>
      )}
      {filtered.length > 0 && pageDone && (
        <div className="mt-16 flex flex-col items-center gap-5 border-t border-[var(--border)] pt-10">
          {pages > 1 && <Pager page={page} pages={pages} total={filtered.length} onGo={goTo} />}
          <p className="max-w-xl text-center text-sm text-[var(--muted)]">
            Everything that opens on another site belongs to its maker. Read what a bot or agent asks to connect before you add it.
          </p>
        </div>
      )}
      {after && filtered.length > 0 && pageDone && <div className="mt-12">{after}</div>}

      {/* Mounted only while open, so every opening starts from a blank box and fades in again. */}
      {guideOpen && (
        <FeedGuide items={everything} intro={intro} bots={kind === "bot"} onClose={closeGuide} onApply={applyFromGuide} />
      )}
      {suggestOpen && <SuggestTool onClose={() => setSuggestOpen(false)} />}
      <NewsletterBar />
    </div>
  );
}

/**
 * Applies ?q= to the search box on mount. Kept in a child inside Suspense, as
 * /browse always has, so useSearchParams does not opt the route out of static
 * rendering. This is the URL the sitelinks SearchAction in the root layout
 * hands to Google.
 */
function QueryParamSync({ onQuery }: { onQuery: (q: string) => void }) {
  const q = useSearchParams().get("q") ?? "";
  useEffect(() => {
    if (q) onQuery(q);
  }, [q, onQuery]);
  return null;
}

function cardId(itemId: string): string {
  return `card-${itemId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

/**
 * Sign in, beside the guide. Until Firebase has answered whether anyone is
 * signed in, the spot holds its size and shows nothing, so a signed-in visitor
 * never sees "Sign in" flash first. Signed in, it is their photo or initial:
 * sellers go to their dashboard, everyone else to their account. Signing in
 * comes back to the page it was pressed on.
 */
function AccountButton({ path }: { path: string }) {
  const user = useUser();
  const resolved = useStoreValue(getAuthResolved);
  const pill =
    "flex h-11 shrink-0 items-center rounded-full bg-[var(--background)] text-sm font-medium shadow-[0_2px_12px_rgba(16,16,20,0.10),0_0_0_1px_rgba(16,16,20,0.05)] hover:bg-[var(--surface-muted)]";

  if (!resolved) return <span className="h-11 w-11 shrink-0 sm:w-[84px]" aria-hidden />;

  if (!user) {
    return (
      <Link href={`/login?next=${encodeURIComponent(path)}`} className={`${pill} w-11 justify-center sm:w-auto sm:px-4`}>
        <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
          <circle cx="10" cy="7" r="3.2" />
          <path d="M3.8 17c.9-3.2 3.2-5 6.2-5s5.3 1.8 6.2 5" />
        </svg>
        <span className="hidden sm:inline">Sign in</span>
        <span className="sr-only sm:hidden">Sign in</span>
      </Link>
    );
  }

  const href = user.role === "seller" || user.role === "admin" ? "/dashboard" : "/account";
  const initial = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <Link href={href} aria-label="Your account" className={`${pill} w-11 justify-center`}>
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#8b1a1a] to-[#c25555] text-sm font-semibold text-white">
          {initial}
        </span>
      )}
    </Link>
  );
}

/* ---------------------------------------------------------------------------
   The menu: the feed's filter and the site's navigation in one list. With no
   header on these pages, this is where Sell, About, the docs and the account
   live.
--------------------------------------------------------------------------- */

const SITE_LINKS = [
  { href: "/sell", label: "Sell your tool" },
  { href: "/grok-bots/submit", label: "Add your Grok Bot" },
  { href: "/about", label: "About" },
  { href: "/docs", label: "Docs" },
  { href: "/how-to-run", label: "How to run a tool" },
];

/** The menu's sections, in order. Each kind names its section in FEED_KINDS. */
const SECTIONS = ["Buy once, own it", "Free", "AI", "Read", "Perks"];

function SiteMenu({
  kind,
  botGroup,
  counts,
  total,
  searching,
  onKind,
  onBotGroup,
  onNavigate,
}: {
  kind: KindFilter;
  botGroup: string;
  counts: Record<string, number>;
  total: number;
  searching: boolean;
  onKind: (k: KindFilter) => void;
  onBotGroup: (g: string) => void;
  onNavigate: () => void;
}) {
  const user = useUser();
  const groups = GROK_BOT_GROUPS.filter((g) => !searching || counts[`bot:${g.id}`] || g.id === botGroup);
  const work = groups.filter((g) => g.side === "work");
  const life = groups.filter((g) => g.side === "life");

  // The bot groups, indented under Grok Bots while it is the open kind.
  const botGroups = (
    <div className="ml-3 border-l border-[var(--border)] pl-2">
      {work.length > 0 && <MenuHeading>Work</MenuHeading>}
      {work.map((g) => (
        <MenuItem key={g.id} active={botGroup === g.id} count={counts[`bot:${g.id}`] ?? 0} onClick={() => onBotGroup(g.id)}>
          {g.label}
        </MenuItem>
      ))}
      {life.length > 0 && <MenuHeading>Life</MenuHeading>}
      {life.map((g) => (
        <MenuItem key={g.id} active={botGroup === g.id} count={counts[`bot:${g.id}`] ?? 0} onClick={() => onBotGroup(g.id)}>
          {g.label}
        </MenuItem>
      ))}
    </div>
  );

  return (
    <div
      role="menu"
      className="absolute left-0 top-[calc(100%+8px)] max-h-[75vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-[var(--background)] p-2 shadow-[0_12px_40px_rgba(16,16,20,0.16),0_0_0_1px_rgba(16,16,20,0.05)]"
    >
      <MenuItem active={kind === "all"} count={total} onClick={() => onKind("all")}>
        Everything
      </MenuItem>
      {SECTIONS.map((section) => {
        // A kind with nothing in it (or nothing matching the search) is left
        // out, unless it is the one open.
        const kinds = FEED_KINDS.filter((k) => k.section === section && ((counts[k.id] ?? 0) > 0 || kind === k.id));
        if (kinds.length === 0) return null;
        return (
          <div key={section}>
            <MenuHeading>{section}</MenuHeading>
            {kinds.map((k) => (
              <div key={k.id}>
                <MenuItem active={kind === k.id && (k.id !== "bot" || botGroup === "all")} count={counts[k.id] ?? 0} onClick={() => onKind(k.id)}>
                  {k.label}
                </MenuItem>
                {k.id === "bot" && kind === "bot" && botGroups}
              </div>
            ))}
          </div>
        );
      })}

      <div className="my-2 h-px bg-[var(--border)]" />
      <MenuHeading>The Solo Market</MenuHeading>
      {SITE_LINKS.map((l) => (
        <MenuLink key={l.href} href={l.href} onClick={onNavigate}>
          {l.label}
        </MenuLink>
      ))}

      <div className="my-2 h-px bg-[var(--border)]" />
      <MenuHeading>You</MenuHeading>
      <MenuLink href="/saved" onClick={onNavigate}>Saved</MenuLink>
      <MenuLink href="/library" onClick={onNavigate}>Library</MenuLink>
      {user ? (
        <>
          {(user.role === "seller" || user.role === "admin") && (
            <MenuLink href="/dashboard" onClick={onNavigate}>Seller dashboard</MenuLink>
          )}
          {user.role === "admin" && <MenuLink href="/admin" onClick={onNavigate}>Admin</MenuLink>}
          <MenuLink href="/account" onClick={onNavigate}>Account</MenuLink>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onNavigate();
              void logout();
            }}
            className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            Sign out
          </button>
        </>
      ) : (
        <MenuLink href="/login" onClick={onNavigate}>Sign in</MenuLink>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuHeading({ children }: { children: ReactNode }) {
  return <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]/70">{children}</p>;
}

function MenuItem({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm ${
        active ? "bg-[var(--surface-muted)] font-medium" : "hover:bg-[var(--surface-muted)]"
      }`}
    >
      <span className="truncate">{children}</span>
      <span className="shrink-0 tabular-nums text-[var(--muted)]">{count}</span>
    </button>
  );
}

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-[var(--surface-muted)]"
    >
      {children}
      <svg viewBox="0 0 16 16" className="h-3 w-3 text-[var(--muted)]" aria-hidden>
        <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/**
 * The page counter at the foot of each hundred: where you are, every page as
 * a number, and previous and next. Long runs of pages fold into an ellipsis
 * around the current one; seven or fewer are all shown.
 */
function Pager({ page, pages, total, onGo }: { page: number; pages: number; total: number; onGo: (p: number) => void }) {
  const from = page * PER_PAGE + 1;
  const to = Math.min(total, (page + 1) * PER_PAGE);
  const nums: (number | "gap")[] = [];
  for (let i = 0; i < pages; i++) {
    if (pages <= 7 || i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "gap") nums.push("gap");
  }
  const step = "grid h-11 min-w-11 place-items-center rounded-full px-3 text-sm font-medium transition-colors";
  return (
    <nav aria-label="Pages" className="flex flex-col items-center gap-3">
      <p className="text-sm text-[var(--muted)]">
        Page <span className="font-medium text-[var(--foreground)]">{page + 1}</span> of {pages}
        <span className="mx-2" aria-hidden>·</span>
        {from} to {to} of {total}
      </p>
      <div className="flex items-center gap-1 rounded-full bg-[var(--background)] p-1 shadow-[0_2px_12px_rgba(16,16,20,0.10),0_0_0_1px_rgba(16,16,20,0.05)]">
        <button
          type="button"
          onClick={() => onGo(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
          className={`${step} hover:bg-[var(--surface-muted)] disabled:opacity-30 disabled:hover:bg-transparent`}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
            <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {nums.map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-[var(--muted)]" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onGo(n)}
              aria-current={n === page ? "page" : undefined}
              className={`${step} ${n === page ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-muted)]"}`}
            >
              {n + 1}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onGo(page + 1)}
          disabled={page >= pages - 1}
          aria-label="Next page"
          className={`${step} hover:bg-[var(--surface-muted)] disabled:opacity-30 disabled:hover:bg-transparent`}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
            <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------------------
   Cards. One shape for every kind: a picture, the title, three lines of
   summary, who made it, and a grey line saying what it is. The picture is
   what changes: a screenshot for tools, a preview for free tools, the bot for
   Grok Bots, and for a blog post a cover that is all title, which is what
   makes those the big cards.
--------------------------------------------------------------------------- */

/**
 * `compact` (Everything) shows the picture, title and summary only; the maker
 * and the grey kind line appear on a filter's own page, where there is room.
 */
function FeedCard({ item, compact = false }: { item: FeedItem; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  // A cover that fails to load (a deleted upload, storage down) falls back to
  // the letter rather than leaving a blank tile.
  const [imgFailed, setImgFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // An image that failed while the page was still server HTML fired its error
  // before React was listening, so look once after mount. Deferred a tick so
  // the state change is not made inside the effect itself.
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      if (el.complete && el.naturalWidth === 0 && el.currentSrc) setImgFailed(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const [dark, light] = botColors(item.kind === "bot" ? item.id.slice(4) : item.id);
  const ratio = ratioOf(item);
  const linkProps = item.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  async function copy() {
    if (!item.copyUrl) return;
    try {
      await navigator.clipboard.writeText(item.copyUrl);
    } catch {
      // Clipboard can be blocked (insecure origin, denied permission). Fall
      // back to a hidden textarea, which every browser still allows on click.
      const t = document.createElement("textarea");
      t.value = item.copyUrl;
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const picture = (
    <a
      href={item.href}
      {...linkProps}
      aria-label={item.title}
      className="relative block overflow-hidden rounded-[22px] shadow-[0_0_0_1px_rgba(16,16,20,0.06)]"
      style={{
        paddingTop: `${ratio * 100}%`,
        background:
          item.kind === "article"
            ? "#f6f3ee" // warm paper, the same as the Thursday email band
            : `linear-gradient(165deg, ${light}2e 0%, ${light}80 100%)`,
      }}
    >
      {item.kind === "bot" && (
        <span className="absolute inset-0 grid place-items-center">
          <BotAvatar id={item.id.slice(4)} motion={botMotion(item.id.slice(4))} className="h-auto w-[34%] max-w-[150px]" />
        </span>
      )}
      {item.kind === "agent" && <AgentTile platform={item.platform} topic={topicFor(item.title, item.summary)} />}
      {item.kind !== "bot" && item.kind !== "agent" && item.kind !== "article" &&
        (item.video && !imgFailed ? (
          <InViewVideo
            src={item.video}
            poster={item.image}
            onFail={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : item.image && !imgFailed ? (
          item.imageFit === "contain" ? (
            <span className="absolute inset-0 grid place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt=""
                loading="lazy"
                onError={() => setImgFailed(true)}
                ref={imgRef}
                className="h-auto w-[30%] max-w-[120px] rounded-[22%] shadow-[0_6px_20px_rgba(16,16,20,0.14)] transition-transform duration-300 group-hover:scale-105"
              />
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt=""
              loading="lazy"
              onError={() => setImgFailed(true)}
              ref={imgRef}
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )
        ) : (
          <span className="absolute inset-0 grid place-items-center text-6xl font-semibold" style={{ color: dark }}>
            {item.title.charAt(0).toUpperCase()}
          </span>
        ))}
      {item.kind === "article" && <ArticleCover item={item} />}
      {item.badge && item.kind !== "article" && (
        <span
          className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium backdrop-blur"
          style={{ color: item.kind === "bot" ? dark : "var(--foreground)" }}
        >
          {item.badge}
        </span>
      )}
    </a>
  );

  return (
    <article
      id={cardId(item.id)}
      className="bot-card group scroll-mt-28 rounded-[26px] transition-shadow duration-700 data-[flash]:shadow-[0_0_0_6px_var(--accent-soft)]"
    >
      <div className="relative">
        {picture}
        {item.copyUrl && (
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Link copied" : `Copy the link to ${item.title}`}
            title="Copy the link, open it, then choose Add to Grok Bot"
            className="absolute bottom-4 left-4 flex h-11 items-center gap-2 rounded-full bg-white/95 px-3.5 text-sm font-medium text-[var(--foreground)] shadow-[0_2px_10px_rgba(16,16,20,0.14)] backdrop-blur transition hover:bg-white active:scale-95"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      <h2 className="mt-4 line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight">
        <a href={item.href} {...linkProps} className="hover:underline hover:underline-offset-4">
          {item.title}
        </a>
      </h2>
      <p className="mt-1.5 line-clamp-3 text-[15px] leading-relaxed text-[var(--muted)]">
        {item.summary}
      </p>

      {!compact && item.byline && item.kind !== "article" && (
        <div className="mt-3 flex items-center gap-2 text-[15px]">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: dark }}
            aria-hidden
          >
            {item.byline.replace(/^@/, "").charAt(0).toUpperCase()}
          </span>
          {item.bylineHref ? (
            <a href={item.bylineHref} target="_blank" rel="noopener noreferrer" className="truncate hover:underline hover:underline-offset-4">
              {item.byline}
            </a>
          ) : (
            <span className="truncate">{item.byline}</span>
          )}
        </div>
      )}
      {!compact && <p className="mt-1.5 text-sm text-[var(--muted)]">{item.meta}</p>}
    </article>
  );
}

/**
 * A blog post's cover: the logo's own mark, four rounded tiles, alone on warm
 * paper, with the topic above and the post's number below. The red tile moves
 * to a different corner from one post to the next, so a row of covers reads
 * as a series without anything generated or decorative.
 */
function ArticleCover({ item }: { item: FeedItem }) {
  const n = item.issue ?? 1;
  const slug = item.id.slice("article:".length);
  // Tiles in reading order: top left, top right, bottom left, bottom right.
  // As in the logo, the white tile sits opposite the red one and the other
  // two are pink; the red walks clockwise from one post to the next.
  const red = [3, 2, 0, 1][n % 4];
  const tiles = [0, 1, 2, 3].map((t) => (t === red ? "#c4383a" : t === 3 - red ? "#ffffff" : "#e3a1a1"));
  return (
    <span className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
      <span className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-[#6b6b76]">
        <span>{item.badge}</span>
        <span>No. {String(n).padStart(2, "0")}</span>
      </span>
      {hasArticleArt(slug) ? (
        <ArticleArt slug={slug} className="h-auto w-[46%] max-w-[190px] self-center transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <span className="grid grid-cols-2 gap-[6px] self-center transition-transform duration-500 group-hover:scale-105" aria-hidden>
          {tiles.map((c, t) => (
            <span
              key={t}
              className="h-7 w-7 rounded-[8px] sm:h-8 sm:w-8"
              style={{ background: c, boxShadow: c === "#ffffff" ? "inset 0 0 0 1px rgba(16,16,20,0.12)" : undefined }}
            />
          ))}
        </span>
      )}
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#6b6b76]">{item.meta.replace(/^Blog · /, "")}</span>
    </span>
  );
}

/**
 * A short muted clip that plays only while most of its card is on screen and
 * pauses when it leaves. Nothing loads until then (preload "none"), and it
 * never plays for visitors who ask for reduced motion or less data: they see
 * the still.
 */
function InViewVideo({
  src,
  poster,
  className,
  onFail,
}: {
  src: string;
  poster?: string;
  className?: string;
  /** A clip that cannot load falls back to the card's still, then its letter. */
  onFail?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // A clip that failed while the page was still server HTML errored before
    // React was listening, so look once after mount.
    const failed = setTimeout(() => {
      if (v.error || v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) onFail?.();
    }, 0);
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const still = saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = still
      ? null
      : new IntersectionObserver(
          ([e]) => {
            if (e.intersectionRatio >= 0.6) v.play().catch(() => {});
            else v.pause();
          },
          { threshold: [0, 0.6] },
        );
    io?.observe(v);
    return () => {
      clearTimeout(failed);
      io?.disconnect();
    };
    // onFail only flips the card to its still; a new function each render
    // must not restart the observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      onError={onFail}
      className={className}
      aria-hidden
    />
  );
}

/**
 * An AI agent's picture: a tile with an icon for what it does, on its
 * platform's own tint (the platform's name is on the badge), so a Claude
 * Skill, an MCP server and a ChatGPT app never read as one of the Grok Bots.
 */
const AGENT_STYLE: Record<string, { tint: string }> = {
  "claude-skill": { tint: "#d97757" },
  mcp: { tint: "#4f6d8f" },
  "chatgpt-app": { tint: "#10a37f" },
};

function AgentTile({ platform, topic }: { platform?: string; topic: string }) {
  const style = AGENT_STYLE[platform ?? ""] ?? AGENT_STYLE.mcp;
  return (
    <span
      className="absolute inset-0 grid place-items-center"
      style={{ background: `linear-gradient(160deg, ${style.tint}1f 0%, ${style.tint}55 100%)` }}
    >
      <span className="grid aspect-square w-[30%] max-w-[120px] place-items-center rounded-[26%] bg-white shadow-[0_8px_24px_rgba(16,16,20,0.14)] transition-transform duration-300 group-hover:-translate-y-1">
        <TopicIcon name={topic} className="h-1/2 w-1/2" color={style.tint} />
      </span>
    </span>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <rect x="7" y="7" width="9" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 4.5H6A1.5 1.5 0 0 0 4.5 6v7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path d="M5 10.5l3.2 3L15 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
